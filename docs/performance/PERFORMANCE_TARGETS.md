# ZeroMerch Performance Targets

Story 13.3 (Issue #52) — Performance Optimization

## Latency Targets

| Endpoint / Feature | Target (p95) | Strategy |
|---|---|---|
| Storefront page load | < 2 s | ISR (`revalidate = 60`) |
| Product detail page | < 2 s | ISR (`revalidate = 300`) |
| Product search (semantic) | < 500 ms | ZeroDB vector index |
| ZeroDB table queries (cached) | < 200 ms | 30s TTL query cache in ZeroDBClient |
| AI Merch Concierge response | < 5 s p95 | Claude Haiku, streaming |
| Stripe webhook processing | < 1 s | Idempotency gate, no duplicate work |
| Audit log write | < 100 ms | Fire-and-forget, non-blocking |
| GDPR data export | < 10 s | Parallel ZeroDB table queries |

## SLO Table

| Service | Availability SLO | Latency SLO (p95) |
|---|---|---|
| Storefront (ISR) | 99.9% | < 2 s |
| Checkout API | 99.5% | < 3 s |
| Stripe webhooks | 99.9% (with idempotency) | < 1 s |
| Audit log ingestion | 99.0% (best-effort) | < 500 ms |
| GDPR export | 99.0% | < 10 s |
| ZeroDB reads (cached) | 99.5% | < 200 ms |
| AI Concierge | 98.0% | < 5 s |

## Optimization Techniques

### ISR (Incremental Static Regeneration)
- `apps/web/src/app/store/[companySlug]/page.tsx` — `revalidate = 60`
- `apps/web/src/app/store/[companySlug]/products/[productId]/page.tsx` — `revalidate = 300`
- Pages served from CDN cache; Next.js regenerates in background without blocking users

### ZeroDB Query Cache
- 30-second TTL in `ZeroDBClient.table().query()`
- Cache keyed by: endpoint path + serialized filter body (including select/limit/offset)
- Write operations (insert, update, delete) bypass cache automatically
- Reduces API round-trips on repeated identical reads within the TTL window

### Bundle Optimization
- `@next/bundle-analyzer` enabled with `ANALYZE=true` environment variable
- Run: `ANALYZE=true pnpm build` to inspect client bundle composition
- Image optimization via Next.js `<Image>` component (automatic WebP conversion, lazy loading)
- External image CDNs allowlisted: `files.cdn.printful.com`, `images.printify.com`

### Webhook Idempotency
- Stripe event IDs stored in ZeroDB events on first successful processing
- Subsequent deliveries of the same event ID return `{ skipped: true }` immediately
- Eliminates duplicate order creation from Stripe retry storms without extra infrastructure

## Monitoring

Track these metrics in production:

- `p95_latency_ms` per route (Next.js instrumentation or Vercel Analytics)
- `cache_hit_rate` for ZeroDB query cache
- `webhook_duplicate_rate` = skipped / total webhook calls (target: < 5%)
- `audit_log_failure_rate` = audit `.catch()` fires / total writes (target: < 1%)
- ISR regeneration frequency via `x-nextjs-cache: STALE/HIT/MISS` response headers
