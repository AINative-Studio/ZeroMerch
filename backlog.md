# ZeroMerch Agile Backlog

## AI-Native Corporate Merch Platform

### Built on ZeroCommerce + ZeroDB + AIKit + AgentSwarm

---

# Product Delivery Philosophy

This backlog is optimized for:

* AI pair programming
* Multi-agent execution
* Minimal backend code
* Heavy reuse of AINative APIs
* TDD + BDD workflows
* Rapid iterative deployment

---

# Batching Strategy

Stories are grouped into **batches** based on shared data model dependencies, parallel agent execution opportunities, and technical coupling. Batching reduces context-switching overhead and allows multi-agent workflows to proceed without blocking.

**Batching rules applied:**
- Stories that write to the same ZeroDB collections are grouped
- Stories that share the same UI surface are grouped
- Stories that have agent/service coupling are grouped
- Stories that have hard sequential dependencies are split into separate batches within a sprint

---

# Sprint Structure (Revised)

| Sprint   | Focus                                | Batches |
| -------- | ------------------------------------ | ------- |
| Sprint 0 | Foundation + Architecture            | A, B    |
| Sprint 1 | Tenant Platform + Brand Kit          | C, D    |
| Sprint 2 | Product Catalog + Storefront         | E, F    |
| Sprint 3 | Checkout + Redemption                | G       |
| Sprint 4 | Campaign Engine                      | H       |
| Sprint 5 | AI Concierge + Budget Engine         | I, J    |
| Sprint 6 | Agent Memory + Semantic Intelligence | K       |
| Sprint 7 | Vendor + Fulfillment                 | L       |
| Sprint 8 | Analytics + Enterprise Hardening     | M, N    |

---

# BATCH A — Platform Scaffold
**Sprint 0 | Parallel execution: Frontend agent + ZeroDB agent run simultaneously**

> Stories 1.1 and 1.2 have no dependencies on each other and can be built in parallel.
> Auth (1.3) can begin once the ZeroDB environment is up.

---

## User Story 1.1 — Initialize Frontend Platform

### Story

As a developer, I want a reusable AIKit-based frontend scaffold so that we minimize custom UI code.

### Acceptance Criteria

* Next.js app initialized
* AIKit integrated
* Tailwind configured
* Theme provider configured
* Shared layout components working
* Authentication wrapper functioning
* CI pipeline enabled

### Technical Notes

* Reuse AIKit components only
* Avoid custom UI libraries
* Dark mode enabled by default

---

## User Story 1.2 — Configure ZeroDB Environment

### Story

As a platform engineer, I want ZeroDB configured as the primary data layer so that all persistence is centralized.

### Acceptance Criteria

* ZeroDB connection established
* Environment variables configured
* Multi-tenant namespaces operational
* CRUD abstraction layer created
* Embedding pipeline enabled
* Event collection enabled

### Technical Notes

* Use ZeroDB SDK
* Avoid ORM creation
* Use schema-driven collections

---

# BATCH B — Authentication
**Sprint 0 | Depends on: Batch A (ZeroDB + frontend scaffold must exist)**

> Auth integrates with the ZeroDB user model and the frontend wrapper simultaneously.
> Blocked until 1.2 ZeroDB namespaces are live.

---

## User Story 1.3 — Configure Auth

### Story

As an enterprise user, I want secure authentication so that companies can manage merch safely.

### Acceptance Criteria

* Login works
* Logout works
* Session persistence works
* Multi-tenant access restrictions work
* Role-based permissions enforced

### Roles

* Admin
* Manager
* Employee
* Finance
* Vendor

---

# BATCH C — Company Workspace + Brand Foundation
**Sprint 1 | Depends on: Batch B (Auth) | Parallel: company setup and brand kit upload run together**

> `companies`, `brand_kits`, and `design_assets` are written together.
> Company creation (2.1) and brand asset upload (3.1 + 3.2) share the same ZeroDB collections
> and are configured by the same admin persona — batch them to avoid two separate admin onboarding flows.

---

## User Story 2.1 — Create Company Workspace

### Story

As an admin, I want to create a branded company workspace.

### Acceptance Criteria

* Company can be created
* Slug uniqueness enforced
* Storefront generated automatically
* Brand kit attachable
* Default budget created
* Company isolation enforced

---

## User Story 3.1 — Upload Brand Assets

### Story

As a marketing admin, I want to upload logos and brand assets.

### Acceptance Criteria

* SVG upload works
* PNG upload works
* Files stored in ZeroDB
* Preview renders correctly
* File metadata indexed

---

## User Story 3.2 — Configure Brand Rules

### Story

As a marketing admin, I want brand governance rules.

### Acceptance Criteria

* Color palettes configurable
* Font restrictions configurable
* Product restrictions configurable
* Restricted phrases configurable

---

# BATCH D — Team + Department Management
**Sprint 1 | Depends on: Batch C (companies must exist) | Parallel: invitations and departments run together**

> `company_users` and `departments` are tightly coupled — departments need managers (users),
> users need department assignments. Build the full RBAC model in one batch.

---

## User Story 2.2 — Invite Team Members

### Story

As an admin, I want to invite employees into my workspace.

### Acceptance Criteria

* Email invitation flow works
* Roles assignable
* Departments assignable
* Duplicate emails prevented
* Invitation expiration enforced

---

## User Story 2.3 — Department Management

### Story

As an admin, I want departments for budget governance.

### Acceptance Criteria

* Departments creatable
* Managers assignable
* Department budgets configurable
* Users assignable to departments

---

# BATCH E — Product Catalog + Search
**Sprint 2 | Depends on: Batch B (ZeroDB env) | Parallel: sync job and embedding pipeline run together**

> `products`, `product_variants`, and `product_embeddings` are populated by the same sync job.
> Semantic search (4.2) is enabled the moment embeddings are written — no reason to split these
> into separate sprints. Collections (4.3) extend the catalog model and ship in the same sprint.

---

## User Story 4.1 — Sync ZeroCommerce Products

### Story

As a platform admin, I want products synced from ZeroCommerce.

### Acceptance Criteria

* Product sync job works
* Variants imported
* Product metadata stored
* Inventory counts synced
* Product images render correctly

---

## User Story 4.2 — Product Search

### Story

As a user, I want semantic merch search.

### Acceptance Criteria

* Keyword search works
* Semantic search works
* Tag filtering works
* Category filtering works
* Search latency under 500ms

### Example Queries

* "premium developer hoodie"
* "executive gifting"
* "event swag"

---

## User Story 4.3 — Product Collections

### Story

As an admin, I want curated merch collections.

### Acceptance Criteria

* Collections creatable
* Products attachable
* Visibility rules configurable
* Department restrictions configurable

---

# BATCH F — Storefront + Shopping Cart
**Sprint 2 | Depends on: Batch E (products must be synced) | Parallel: storefront, PDP, and cart are one UI build**

> The company storefront (5.1), product detail page (5.2), and cart (5.3) are a single
> end-to-end frontend build. No meaningful reason to split them — they share state,
> routing, and the same AIKit component surface.

---

## User Story 5.1 — Company Storefront

### Story

As an employee, I want a branded merch storefront.

### Acceptance Criteria

* Company branding renders
* Product catalog renders
* Responsive design works
* Login persistence works
* Product filtering works

---

## User Story 5.2 — Product Detail Page

### Story

As a buyer, I want detailed product information.

### Acceptance Criteria

* Product variants selectable
* Inventory displayed
* Product images render
* Size selection works
* Brand customization preview works

---

## User Story 5.3 — Shopping Cart

### Story

As a user, I want to manage my cart.

### Acceptance Criteria

* Add/remove items works
* Quantity updates work
* Budget visibility shown
* Cart persistence works

---

# BATCH G — Checkout + Redemption System
**Sprint 3 | Depends on: Batch F (cart must exist) | All three share Stripe + redemption_links + orders**

> Stripe checkout (6.1), employee credits (6.2), and gift redemption (6.3) all write to
> `orders`, `order_items`, and `redemption_links`. Splitting them creates incomplete checkout
> flows in each sprint. Build the entire payment and redemption surface together.

---

## User Story 6.1 — Stripe Checkout Integration

### Story

As a customer, I want secure checkout.

### Acceptance Criteria

* Stripe checkout works
* Taxes calculated
* Shipping calculated
* Order persisted
* Webhooks processed

---

## User Story 6.2 — Employee Redemption Credits

### Story

As an employee, I want to redeem merch credits.

### Acceptance Criteria

* Credit balance visible
* Redemption links function
* Credits decrement correctly
* Overages prevented
* Expiration enforced

---

## User Story 6.3 — Gift Redemption Flow

### Story

As a recipient, I want a frictionless gift claim experience.

### Acceptance Criteria

* Claim links work
* Guest checkout supported
* Shipping collection works
* Expired links blocked

---

# BATCH H — Campaign Engine + Event Drops
**Sprint 4 | Depends on: Batch G (orders + redemption must exist) | All three build the campaigns table**

> Campaign creation (7.1), event drops (7.2), and scheduled activation (7.3) all operate
> on `campaigns`, `campaign_products`, and `redemption_links`. Event drops are a campaign
> subtype, not a separate system. Schedule logic is part of campaign state management.
> One agent can own the full campaign lifecycle.

---

## User Story 7.1 — Create Merch Campaign

### Story

As a marketer, I want campaign-based merch drops.

### Acceptance Criteria

* Campaigns creatable
* Start/end dates configurable
* Product collections attachable
* Budgets configurable
* Visibility rules configurable

---

## User Story 7.2 — Event Merch Drops

### Story

As an event organizer, I want temporary merch stores.

### Acceptance Criteria

* QR access works
* Expiration enforced
* Limited inventory enforced
* Invite-only mode supported

---

## User Story 7.3 — Scheduled Campaign Activation

### Story

As an admin, I want automated campaign activation.

### Acceptance Criteria

* Scheduled activation works
* Scheduled expiration works
* Notifications triggered
* Inventory validation occurs

---

# BATCH I — AI Merch Concierge
**Sprint 5 | Depends on: Batch H (campaigns must exist) | Chat and AI campaign gen share the same agent**

> The conversational merch agent (8.1) and AI campaign generation (8.2) are the same
> AgentSwarm workflow — the chat interface IS the campaign generation interface.
> Splitting them would require building a half-functional agent twice.

---

## User Story 8.1 — Conversational Merch Agent

### Story

As a user, I want to interact with merch using natural language.

### Acceptance Criteria

* Chat interface operational
* Context persistence works
* Product recommendations generated
* Campaign creation supported
* Budget awareness functional

---

## User Story 8.2 — AI Campaign Generation

### Story

As a marketer, I want AI-generated merch campaigns.

### Acceptance Criteria

* Campaign drafts generated
* Products recommended
* Budget estimates generated
* Brand compliance checked
* Human approval workflow supported

---

# BATCH J — Budget Engine + AI Recommendations + Brand Compliance
**Sprint 5 | Depends on: Batch C (companies), Batch I (AI agent live) | Budget system and AI recs are co-dependent**

> Budget creation (9.1), approvals (9.2), and enforcement (9.3) are one system — `budgets`
> and `approval_requests` tables are written together and the UI is a single admin surface.
> AI budget recommendations (8.3) require the budget system to exist AND the concierge
> agent to be live, so it ships in the same sprint as the budget engine.
> AI brand compliance review (3.3) requires the agent infrastructure from Batch I — moved here.

---

## User Story 9.1 — Budget Creation

### Story

As finance, I want configurable merch budgets.

### Acceptance Criteria

* Budget limits configurable
* Time periods configurable
* Department budgets supported
* Spend tracking operational

---

## User Story 9.2 — Approval Workflows

### Story

As a manager, I want approval routing.

### Acceptance Criteria

* Threshold approvals work
* Multi-step approvals supported
* Escalation logic supported
* AI recommendations visible

---

## User Story 9.3 — Budget Enforcement

### Story

As finance, I want hard budget enforcement.

### Acceptance Criteria

* Over-budget orders blocked
* Notifications triggered
* Exceptions tracked
* Audit logs stored

---

## User Story 8.3 — AI Budget Recommendations

### Story

As finance, I want AI spending recommendations.

### Acceptance Criteria

* Spend forecasting generated
* Overages predicted
* Department anomalies detected
* Cost optimization suggestions surfaced

---

## User Story 3.3 — AI Brand Compliance Review

### Story

As a company admin, I want AI to review merch designs.

### Acceptance Criteria

* AI reviews submitted assets
* Approval score generated
* Violations surfaced
* Human override available
* Review history persisted

### Note

> Moved from Sprint 1 — requires AgentSwarm infrastructure (Batch I) and brand kit
> foundation (Batch C) to both be live before this agent can be wired up.

---

# BATCH K — Agent Memory + Semantic Intelligence
**Sprint 6 | Depends on: Batch I (agent live), Batch H (campaigns exist) | All three use ZeroMemory + vector collections**

> Agent memory persistence (10.1), semantic campaign search (10.2), and preference
> learning (10.3) all write to `agent_memories`, `campaign_embeddings`, and
> `product_embeddings`. These are one ZeroMemory integration sprint — the same
> SDK calls power all three capabilities.

---

## User Story 10.1 — Agent Memory Persistence

### Story

As an AI agent, I want persistent operational memory.

### Acceptance Criteria

* Memory persistence works
* Retrieval works
* Context injection works
* Decay scoring works
* Memory namespaces enforced

---

## User Story 10.2 — Semantic Campaign Search

### Story

As a marketer, I want semantic retrieval of historical campaigns.

### Acceptance Criteria

* Similar campaigns retrievable
* Vector search operational
* Multi-hop retrieval works
* Results ranked semantically

---

## User Story 10.3 — Preference Learning

### Story

As a recipient, I want recommendations personalized.

### Acceptance Criteria

* Purchase history indexed
* Preferences inferred
* Size history retained
* Recommendations improve over time

---

# BATCH L — Vendor + Fulfillment Stack
**Sprint 7 | Depends on: Batch G (orders must exist) | All three share vendors + shipments tables**

> Vendor management (11.1), shipment tracking (11.2), and inventory alerts (11.3) build
> the `vendors`, `vendor_products`, and `shipments` collections together. Tracking requires
> vendors to exist; inventory alerts are a property of `product_variants` reorder thresholds.
> One fulfillment agent owns the full lifecycle.

---

## User Story 11.1 — Vendor Management

### Story

As operations, I want vendor management.

### Acceptance Criteria

* Vendors creatable
* Capabilities configurable
* Lead times configurable
* Quality scores trackable

---

## User Story 11.2 — Shipment Tracking

### Story

As a recipient, I want shipment visibility.

### Acceptance Criteria

* Tracking URLs visible
* Delivery status updates work
* Carrier webhooks process correctly

---

## User Story 11.3 — Inventory Alerts

### Story

As operations, I want low inventory alerts.

### Acceptance Criteria

* Threshold alerts trigger
* Suggested reorder quantities generated
* Notifications delivered

---

# BATCH M — Analytics + Reporting
**Sprint 8 | Depends on: Batches G, H, J (orders, campaigns, budgets must have data) | All read-only dashboards**

> Campaign analytics (12.1), department spend (12.2), and AI insights (12.3) are all
> read-only aggregation views over existing data. They share the same dashboard surface
> and the same ZeroDB query patterns. AI insights (12.3) are a concierge agent call
> over the analytics data — same sprint as the dashboards they analyze.

---

## User Story 12.1 — Campaign Analytics

### Story

As a marketer, I want merch campaign analytics.

### Acceptance Criteria

* Redemption metrics visible
* Spend metrics visible
* Top products visible
* ROI metrics visible

---

## User Story 12.2 — Department Spend Dashboard

### Story

As finance, I want spend visibility.

### Acceptance Criteria

* Spend by department visible
* Spend trends visible
* Budget overages highlighted

---

## User Story 12.3 — AI Operational Insights

### Story

As leadership, I want AI-generated operational recommendations.

### Acceptance Criteria

* Waste detected
* Popular products surfaced
* Budget inefficiencies identified
* Vendor recommendations generated

---

# BATCH N — Enterprise Hardening
**Sprint 8 | Depends on: All prior batches complete | Cross-cutting concerns applied globally**

> Audit logging (13.1), GDPR (13.2), and performance optimization (13.3) are cross-cutting
> concerns that must be applied after the full feature surface exists. They cannot be
> meaningfully batched earlier because they instrument and harden a system that doesn't
> fully exist yet. All three can run in parallel — different agents, no shared state.

---

## User Story 13.1 — Audit Logging

### Story

As compliance, I want audit logs.

### Acceptance Criteria

* All actions logged
* Agent actions logged
* Export functionality works
* Immutable event history maintained

---

## User Story 13.2 — GDPR + Data Export

### Story

As a customer, I want data portability.

### Acceptance Criteria

* User data export works
* Deletion workflows work
* GDPR requests logged

---

## User Story 13.3 — Performance Optimization

### Story

As a platform engineer, I want scalable performance.

### Acceptance Criteria

* Storefront loads under 2s
* Search under 500ms
* Agent responses under 5s
* Webhook retries supported

---

# Batch Dependency Graph

```
Batch A (1.1, 1.2) ──────────────────────────────┐
                                                   ▼
Batch B (1.3) ──────────────────────────────────► Batch C (2.1, 3.1, 3.2)
                                                         │
                                                         ▼
                                                   Batch D (2.2, 2.3)

Batch A (1.2) ──► Batch E (4.1, 4.2, 4.3)
                         │
                         ▼
                   Batch F (5.1, 5.2, 5.3)
                         │
                         ▼
                   Batch G (6.1, 6.2, 6.3)
                         │
                         ▼
                   Batch H (7.1, 7.2, 7.3)
                         │
                         ▼
                   Batch I (8.1, 8.2) ──► Batch K (10.1, 10.2, 10.3)
                         │
                         ▼
            Batch J (9.1, 9.2, 9.3, 8.3, 3.3)
                         │
                         ▼
                   Batch G ──► Batch L (11.1, 11.2, 11.3)

Batches G + H + J ──► Batch M (12.1, 12.2, 12.3)
All batches ──────► Batch N (13.1, 13.2, 13.3)
```

---

# Agent Assignment by Batch

| Batch | Agent(s)                          |
| ----- | --------------------------------- |
| A     | Frontend Agent + Data Agent       |
| B     | Frontend Agent                    |
| C     | Frontend Agent + Data Agent       |
| D     | Frontend Agent + Data Agent       |
| E     | Commerce Agent + Data Agent       |
| F     | Frontend Agent + Commerce Agent   |
| G     | Commerce Agent + Data Agent       |
| H     | Commerce Agent + Data Agent       |
| I     | AI Concierge Agent                |
| J     | AI Concierge Agent + Data Agent   |
| K     | Memory Agent + Data Agent         |
| L     | Fulfillment Agent + Commerce Agent|
| M     | Analytics Agent + AI Concierge    |
| N     | DevOps Agent + QA Agent           |

---

# Definition of Done (Global)

Every story must include:

* Unit tests
* BDD acceptance tests
* API contract tests
* Mobile responsiveness
* Accessibility compliance
* Audit logging
* AI error handling
* ZeroDB schema validation
* Documentation
* Agent execution notes

---

# MVP Priority Batches

Batches required for a functional enterprise merch platform:

1. **Batch A** — Frontend scaffold + ZeroDB env
2. **Batch B** — Auth
3. **Batch C** — Company workspace + brand kit
4. **Batch E** — Product catalog + search
5. **Batch F** — Storefront + cart
6. **Batch G** — Checkout + redemption
7. **Batch H** — Campaign engine
8. **Batch I** — AI concierge
9. **Batch J** (partial) — Budget creation + enforcement
10. **Batch K** — Agent memory

Batches D, L, M, N are post-MVP.
