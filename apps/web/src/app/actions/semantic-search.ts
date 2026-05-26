"use server";

// ---------------------------------------------------------------------------
// Server Actions — Semantic Campaign Search
// Story 10.2 — Issue #39
// ---------------------------------------------------------------------------

import { ZeroDBClient } from "@zeromerch/zerodb";
import { getSession } from "@zeromerch/auth";
import { redirect } from "next/navigation";
import type { Campaign, VectorMatch } from "@zeromerch/zerodb";

const PROJECT_ID =
  process.env["ZERODB_PROJECT_ID"] ?? "dcab7bc7-1ec1-4326-9dd4-ca7c80a499ec";

const db = new ZeroDBClient({ projectId: PROJECT_ID });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CampaignSearchResult {
  campaign: Campaign;
  similarity_score: number;
}

// ─── Embedding helper ─────────────────────────────────────────────────────────

async function getEmbedding(text: string): Promise<number[] | null> {
  const apiToken = process.env["ZERODB_API_TOKEN"];
  const apiUrl = process.env["ZERODB_API_URL"] ?? "https://api.ainative.studio";

  if (!apiToken) return null;

  try {
    const res = await fetch(
      `${apiUrl}/api/v1/projects/${PROJECT_ID}/embeddings/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      }
    );

    if (!res.ok) return null;

    const body = (await res.json()) as { embedding?: number[]; data?: number[] };
    const vector = body.embedding ?? body.data;
    return Array.isArray(vector) ? vector : null;
  } catch {
    return null;
  }
}

/**
 * Build the embedding text for a campaign record.
 * Combines name, type, agent_prompt, and status into a rich text block
 * for meaningful semantic representation.
 */
function buildCampaignEmbeddingText(campaign: Campaign): string {
  const parts: string[] = [campaign.name, `type: ${campaign.type}`, `status: ${campaign.status}`];
  if (campaign.agent_prompt) parts.push(campaign.agent_prompt);
  return parts.join(". ");
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Semantic search across campaigns for a company.
 *
 * Steps:
 * 1. Embed query text via ZeroDB embeddings API.
 * 2. Vector search on `campaign_embeddings` collection — top 20 candidates.
 * 3. For each vector match with company_id match, fetch the full campaign record.
 * 4. Return top 10 results sorted by similarity score descending.
 *
 * Falls back to keyword scan if no embedding is available.
 */
export async function searchCampaigns(
  companyId: string,
  query: string
): Promise<{ results: CampaignSearchResult[] } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!companyId) return { error: "companyId is required" };
  if (!query.trim()) return { results: [] };

  try {
    const [queryVector, allCampaignsResult] = await Promise.all([
      getEmbedding(query),
      db.table("campaigns").query({ company_id: companyId }, 1, 200),
    ]);

    const allCampaigns = allCampaignsResult.data ?? [];
    const campaignMap = new Map<string, Campaign>(allCampaigns.map((c) => [c.id, c]));

    if (queryVector) {
      const vectorClient = db.vector("campaign_embeddings");
      const matches: VectorMatch[] = await vectorClient.search(queryVector, 20);

      const results: CampaignSearchResult[] = [];
      const seen = new Set<string>();

      for (const match of matches) {
        const objectId = match.metadata["object_id"] as string | undefined;
        const matchCompanyId = match.metadata["company_id"] as string | undefined;

        if (!objectId || seen.has(objectId) || matchCompanyId !== companyId) continue;

        const campaign = campaignMap.get(objectId);
        if (campaign) {
          results.push({ campaign, similarity_score: match.score });
          seen.add(objectId);
        }
      }

      // Return top 10 by score
      return { results: results.slice(0, 10) };
    }

    // Fallback: keyword match on name and agent_prompt
    const queryLower = query.toLowerCase();
    const results: CampaignSearchResult[] = allCampaigns
      .filter((c) => {
        const nameMatch = c.name.toLowerCase().includes(queryLower);
        const promptMatch = c.agent_prompt?.toLowerCase().includes(queryLower) ?? false;
        return nameMatch || promptMatch;
      })
      .slice(0, 10)
      .map((c) => ({
        campaign: c,
        similarity_score: c.name.toLowerCase().includes(queryLower) ? 0.7 : 0.5,
      }));

    return { results };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return { error: message };
  }
}

/**
 * Index a campaign by generating its embedding and upserting to `campaign_embeddings`.
 *
 * Should be called after campaign creation or update to keep the vector
 * index current. Idempotent — upsert by campaign ID.
 */
export async function indexCampaign(
  campaignId: string,
  companyId: string
): Promise<{ indexed: true } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const campaign = await db.table("campaigns").get(campaignId);

    if (campaign.company_id !== companyId) {
      return { error: "Campaign not found for this company" };
    }

    const embeddingText = buildCampaignEmbeddingText(campaign);
    const vector = await getEmbedding(embeddingText);

    if (!vector) {
      return { error: "Embedding generation failed — check ZERODB_API_TOKEN" };
    }

    const vectorClient = db.vector("campaign_embeddings");
    await vectorClient.upsert(campaignId, vector, {
      object_id: campaignId,
      object_type: "campaign",
      company_id: companyId,
      campaign_type: campaign.type,
      status: campaign.status,
      embedding_text: embeddingText,
    });

    return { indexed: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Indexing failed";
    return { error: message };
  }
}

/**
 * Find campaigns similar to a given campaign using multi-hop retrieval.
 *
 * Hop 1: Embed the source campaign, find top-5 similar campaigns.
 * Hop 2: For each hop-1 result, find its top-3 similar campaigns.
 * Merge and de-duplicate, excluding the source campaign.
 * Return up to 10 results sorted by highest similarity score seen.
 */
export async function findSimilarCampaigns(
  campaignId: string,
  companyId: string
): Promise<{ results: CampaignSearchResult[] } | { error: string }> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const campaign = await db.table("campaigns").get(campaignId);

    if (campaign.company_id !== companyId) {
      return { error: "Campaign not found for this company" };
    }

    // Hop 1: embed source campaign → top 5 similar
    const sourceText = buildCampaignEmbeddingText(campaign);
    const sourceVector = await getEmbedding(sourceText);

    if (!sourceVector) {
      return { error: "Embedding generation unavailable" };
    }

    const vectorClient = db.vector("campaign_embeddings");
    const hop1Matches: VectorMatch[] = await vectorClient.search(sourceVector, 6);

    // Exclude the source campaign itself
    const hop1Filtered = hop1Matches.filter(
      (m) => (m.metadata["object_id"] as string) !== campaignId &&
              (m.metadata["company_id"] as string) === companyId
    );

    // Accumulate all results in a score map (max score wins for dupes)
    const scoreMap = new Map<string, number>();
    for (const m of hop1Filtered) {
      const id = m.metadata["object_id"] as string;
      if (id) scoreMap.set(id, Math.max(scoreMap.get(id) ?? 0, m.score));
    }

    // Hop 2: for each hop-1 result, embed and search for additional similar campaigns
    const hop2Promises = hop1Filtered.slice(0, 5).map(async (match) => {
      const hop1Id = match.metadata["object_id"] as string;
      if (!hop1Id) return;

      try {
        const hop1Campaign = await db.table("campaigns").get(hop1Id);
        const hop1Text = buildCampaignEmbeddingText(hop1Campaign);
        const hop1Vector = await getEmbedding(hop1Text);
        if (!hop1Vector) return;

        const hop2Matches: VectorMatch[] = await vectorClient.search(hop1Vector, 4);
        for (const m of hop2Matches) {
          const id = m.metadata["object_id"] as string;
          const matchCo = m.metadata["company_id"] as string;
          if (id && id !== campaignId && matchCo === companyId) {
            // Attenuate hop-2 scores slightly to rank hop-1 higher
            const attenuated = m.score * 0.8;
            scoreMap.set(id, Math.max(scoreMap.get(id) ?? 0, attenuated));
          }
        }
      } catch {
        // Non-fatal: skip hop-2 for this candidate
      }
    });

    await Promise.all(hop2Promises);

    // Fetch full campaign records for all accumulated IDs
    const candidateIds = [...scoreMap.keys()];
    const campaignRecords = await Promise.all(
      candidateIds.map(async (id) => {
        try {
          return await db.table("campaigns").get(id);
        } catch {
          return null;
        }
      })
    );

    const results: CampaignSearchResult[] = candidateIds
      .map((id, i) => ({ campaign: campaignRecords[i], score: scoreMap.get(id)! }))
      .filter((r): r is { campaign: Campaign; score: number } => r.campaign !== null)
      .map(({ campaign, score }) => ({ campaign, similarity_score: score }))
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, 10);

    return { results };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Similarity search failed";
    return { error: message };
  }
}
