# ZeroMerch ZeroDB Data Model

Built to use **ZeroDB as the main data plane**: tables, vectors, memory, files, events, and embeddings in one API. The docs describe ZeroDB as supporting “vectors, memory, files, tables, events, and free embeddings,” while ZeroMemory adds working, episodic, and semantic memory with GraphRAG hybrid search. ([AINative Studio][1])

## 1. Core Tenant Tables

### `companies`

```json
{
  "id": "company_uuid",
  "name": "Acme AI",
  "slug": "acme-ai",
  "domain": "acme.ai",
  "storefront_url": "https://acme.zeromerch.ai",
  "logo_file_id": "file_uuid",
  "brand_kit_id": "brand_kit_uuid",
  "billing_customer_id": "stripe_customer_id",
  "default_currency": "USD",
  "status": "active",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### `company_users`

```json
{
  "id": "user_uuid",
  "company_id": "company_uuid",
  "email": "jane@acme.ai",
  "full_name": "Jane Smith",
  "role": "admin | manager | employee | finance | vendor",
  "department_id": "department_uuid",
  "status": "active",
  "sso_subject": "external_sso_id",
  "created_at": "timestamp"
}
```

### `departments`

```json
{
  "id": "department_uuid",
  "company_id": "company_uuid",
  "name": "Sales",
  "budget_id": "budget_uuid",
  "manager_user_id": "user_uuid",
  "created_at": "timestamp"
}
```

## 2. Brand + Compliance

### `brand_kits`

```json
{
  "id": "brand_kit_uuid",
  "company_id": "company_uuid",
  "name": "Acme Master Brand",
  "primary_colors": ["#00FF88", "#111111"],
  "secondary_colors": ["#FFFFFF"],
  "fonts": ["Inter", "Space Grotesk"],
  "logo_files": ["file_uuid"],
  "approved_phrases": ["Build the Future"],
  "restricted_phrases": ["Guaranteed ROI"],
  "tone": "premium, technical, confident",
  "compliance_rules": {
    "min_logo_clearspace": "24px",
    "allowed_backgrounds": ["black", "white", "transparent"],
    "restricted_products": ["alcohol", "political_items"]
  },
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### `design_assets`

```json
{
  "id": "asset_uuid",
  "company_id": "company_uuid",
  "brand_kit_id": "brand_kit_uuid",
  "file_id": "zerodb_file_uuid",
  "asset_type": "logo | icon | pattern | mockup | print_file",
  "usage_status": "approved | pending | rejected",
  "metadata": {
    "format": "svg",
    "dimensions": "1024x1024",
    "safe_for_print": true
  },
  "created_by": "user_uuid",
  "created_at": "timestamp"
}
```

### `design_reviews`

```json
{
  "id": "review_uuid",
  "company_id": "company_uuid",
  "asset_id": "asset_uuid",
  "product_id": "product_uuid",
  "agent_id": "brand_compliance_agent",
  "status": "approved | rejected | needs_human_review",
  "score": 0.94,
  "findings": [
    "Logo clearspace passes.",
    "Contrast passes.",
    "Print file resolution passes."
  ],
  "created_at": "timestamp"
}
```

## 3. Commerce Catalog

ZeroCommerce already provides ecommerce API capabilities including **product templating, semantic search, Stripe checkout, webhooks, and GDPR export**. ([AINative Studio][1])

### `products`

```json
{
  "id": "product_uuid",
  "company_id": "company_uuid",
  "zerocommerce_product_id": "zc_product_id",
  "name": "Premium Hoodie",
  "description": "Heavyweight embroidered hoodie",
  "category": "apparel",
  "tags": ["hoodie", "employee", "premium"],
  "base_price": 65.00,
  "currency": "USD",
  "vendor_id": "vendor_uuid",
  "status": "active",
  "semantic_text": "Premium black hoodie for employee onboarding and events",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### `product_variants`

```json
{
  "id": "variant_uuid",
  "product_id": "product_uuid",
  "zerocommerce_variant_id": "zc_variant_id",
  "sku": "HOODIE-BLK-L",
  "size": "L",
  "color": "Black",
  "price": 65.00,
  "inventory_count": 120,
  "reorder_threshold": 25,
  "status": "active"
}
```

### `product_templates`

```json
{
  "id": "template_uuid",
  "company_id": "company_uuid",
  "name": "New Hire Kit Template",
  "description": "Default employee onboarding merch kit",
  "product_ids": ["product_uuid_1", "product_uuid_2"],
  "default_budget": 120.00,
  "rules": {
    "allowed_departments": ["Engineering", "Product"],
    "requires_approval": false
  },
  "created_at": "timestamp"
}
```

## 4. Campaigns + Drops

### `campaigns`

```json
{
  "id": "campaign_uuid",
  "company_id": "company_uuid",
  "name": "GDC 2026 Hackathon Drop",
  "type": "event_drop | onboarding | customer_gift | employee_store | vip_drop",
  "status": "draft | active | paused | completed | archived",
  "start_at": "timestamp",
  "end_at": "timestamp",
  "budget_id": "budget_uuid",
  "created_by": "user_uuid",
  "agent_generated": true,
  "agent_prompt": "Create a merch drop for our GDC hackathon.",
  "created_at": "timestamp"
}
```

### `campaign_products`

```json
{
  "id": "campaign_product_uuid",
  "campaign_id": "campaign_uuid",
  "product_id": "product_uuid",
  "variant_rules": {
    "allow_sizes": true,
    "allow_colors": ["Black", "White"]
  },
  "max_quantity_per_recipient": 1,
  "display_order": 1
}
```

### `redemption_links`

```json
{
  "id": "redemption_link_uuid",
  "company_id": "company_uuid",
  "campaign_id": "campaign_uuid",
  "recipient_id": "recipient_uuid",
  "token_hash": "hashed_token",
  "status": "unused | used | expired | revoked",
  "credit_amount": 100.00,
  "expires_at": "timestamp",
  "created_at": "timestamp"
}
```

## 5. Recipients + Profiles

### `recipients`

```json
{
  "id": "recipient_uuid",
  "company_id": "company_uuid",
  "type": "employee | customer | prospect | partner | investor | event_attendee",
  "email": "person@example.com",
  "full_name": "Person Name",
  "external_ref": "crm_contact_id",
  "department_id": "department_uuid",
  "status": "active",
  "created_at": "timestamp"
}
```

### `recipient_preferences`

```json
{
  "id": "preference_uuid",
  "recipient_id": "recipient_uuid",
  "shirt_size": "L",
  "hoodie_size": "XL",
  "shoe_size": null,
  "preferred_colors": ["black", "green"],
  "shipping_address_id": "address_uuid",
  "allergies_or_restrictions": [],
  "updated_at": "timestamp"
}
```

### `addresses`

```json
{
  "id": "address_uuid",
  "recipient_id": "recipient_uuid",
  "name": "Jane Smith",
  "line1": "123 Market St",
  "line2": "Suite 400",
  "city": "San Francisco",
  "state": "CA",
  "postal_code": "94105",
  "country": "US",
  "is_default": true,
  "created_at": "timestamp"
}
```

## 6. Orders + Redemption

### `orders`

```json
{
  "id": "order_uuid",
  "company_id": "company_uuid",
  "campaign_id": "campaign_uuid",
  "recipient_id": "recipient_uuid",
  "zerocommerce_order_id": "zc_order_id",
  "stripe_checkout_session_id": "cs_test_123",
  "status": "pending | paid | fulfilled | shipped | delivered | cancelled",
  "subtotal": 95.00,
  "shipping": 12.00,
  "tax": 8.50,
  "total": 115.50,
  "paid_by": "company_credit | recipient | department_budget | customer_success_budget",
  "created_at": "timestamp"
}
```

### `order_items`

```json
{
  "id": "order_item_uuid",
  "order_id": "order_uuid",
  "product_id": "product_uuid",
  "variant_id": "variant_uuid",
  "quantity": 1,
  "unit_price": 65.00,
  "customization": {
    "logo_asset_id": "asset_uuid",
    "placement": "left_chest",
    "thread_color": "#00FF88"
  }
}
```

### `shipments`

```json
{
  "id": "shipment_uuid",
  "order_id": "order_uuid",
  "vendor_id": "vendor_uuid",
  "carrier": "UPS",
  "tracking_number": "1Z999",
  "status": "label_created | in_transit | delivered | exception",
  "estimated_delivery_at": "timestamp",
  "delivered_at": "timestamp"
}
```

## 7. Budgets + Governance

### `budgets`

```json
{
  "id": "budget_uuid",
  "company_id": "company_uuid",
  "name": "Sales Q3 Customer Gifting",
  "owner_user_id": "user_uuid",
  "scope": "company | department | campaign | user",
  "limit_amount": 25000.00,
  "spent_amount": 8750.00,
  "currency": "USD",
  "period": "monthly | quarterly | annual | campaign",
  "requires_approval_over": 500.00,
  "status": "active"
}
```

### `approval_requests`

```json
{
  "id": "approval_uuid",
  "company_id": "company_uuid",
  "request_type": "order | campaign | design | budget_exception",
  "request_ref_id": "order_or_campaign_uuid",
  "requested_by": "user_uuid",
  "approver_user_id": "user_uuid",
  "status": "pending | approved | rejected | escalated",
  "reason": "Order exceeds department threshold.",
  "agent_recommendation": "approve",
  "created_at": "timestamp",
  "resolved_at": "timestamp"
}
```

## 8. Vendors + Fulfillment

### `vendors`

```json
{
  "id": "vendor_uuid",
  "name": "Print Partner Inc.",
  "type": "print_on_demand | bulk_fulfillment | local_vendor",
  "api_provider": "printful | printify | custom | manual",
  "status": "active",
  "capabilities": ["embroidery", "screen_print", "stickers"],
  "average_turnaround_days": 7,
  "quality_score": 0.91,
  "created_at": "timestamp"
}
```

### `vendor_products`

```json
{
  "id": "vendor_product_uuid",
  "vendor_id": "vendor_uuid",
  "product_id": "product_uuid",
  "external_product_id": "external_vendor_id",
  "cost": 32.50,
  "minimum_order_quantity": 1,
  "lead_time_days": 7
}
```

## 9. Agent Memory Collections

Use ZeroMemory for operational continuity because docs describe multi-tier memory with consolidation, decay scoring, and GraphRAG hybrid search. ([AINative Studio][1])

### `agent_memories`

```json
{
  "id": "memory_uuid",
  "company_id": "company_uuid",
  "agent_name": "merch_concierge",
  "memory_type": "working | episodic | semantic",
  "subject": "Acme prefers black premium hoodies for engineering events.",
  "content": "Engineering leadership approved black heavyweight hoodies with green embroidery for major developer events.",
  "entities": ["Acme", "Engineering", "hoodies", "developer events"],
  "importance": 0.86,
  "decay_score": 0.12,
  "source_ref": "campaign_uuid",
  "created_at": "timestamp"
}
```

### Suggested memory namespaces

```text
company:{company_id}:brand
company:{company_id}:campaigns
company:{company_id}:vendors
company:{company_id}:employee_preferences
company:{company_id}:customer_gifting
company:{company_id}:budget_policy
```

## 10. Semantic / Vector Collections

### `product_embeddings`

```json
{
  "id": "embedding_uuid",
  "company_id": "company_uuid",
  "object_type": "product",
  "object_id": "product_uuid",
  "embedding_text": "Premium black hoodie for employee onboarding, hackathons, developer events, and VIP gifting.",
  "metadata": {
    "category": "apparel",
    "price": 65.00,
    "tags": ["premium", "hoodie", "developer"]
  },
  "created_at": "timestamp"
}
```

### `campaign_embeddings`

```json
{
  "id": "embedding_uuid",
  "company_id": "company_uuid",
  "object_type": "campaign",
  "object_id": "campaign_uuid",
  "embedding_text": "GDC 2026 hackathon merch drop for developers with black hoodies, stickers, and QR redemption.",
  "metadata": {
    "campaign_type": "event_drop",
    "status": "completed"
  }
}
```

## 11. Events Table

ZeroDB supports events as part of the core API surface. ([AINative Studio][1]) Use this as the automation spine.

### `events`

```json
{
  "id": "event_uuid",
  "company_id": "company_uuid",
  "event_type": "campaign.created | order.paid | order.shipped | budget.exceeded | inventory.low | design.approved | redemption.used",
  "actor_type": "user | agent | system | webhook",
  "actor_id": "user_or_agent_id",
  "object_type": "campaign | order | product | budget | design",
  "object_id": "object_uuid",
  "payload": {},
  "processed": false,
  "created_at": "timestamp"
}
```

## 12. Webhook Subscriptions

ZeroCommerce includes webhook subscriptions, so keep these lightweight. ([AINative Studio][1])

### `webhook_subscriptions`

```json
{
  "id": "webhook_uuid",
  "company_id": "company_uuid",
  "name": "HubSpot Closed Won Gift Trigger",
  "source": "hubspot | salesforce | stripe | zerocommerce | custom",
  "event_type": "deal.closed_won",
  "target_agent": "customer_gifting_agent",
  "status": "active",
  "secret_ref": "agent_cloud_secret_id",
  "created_at": "timestamp"
}
```

## 13. Minimal Relationship Map

```text
companies
 ├── company_users
 ├── departments
 ├── brand_kits
 │    └── design_assets
 ├── products
 │    ├── product_variants
 │    └── product_embeddings
 ├── product_templates
 ├── campaigns
 │    ├── campaign_products
 │    ├── redemption_links
 │    └── campaign_embeddings
 ├── recipients
 │    ├── recipient_preferences
 │    └── addresses
 ├── orders
 │    ├── order_items
 │    └── shipments
 ├── budgets
 ├── approval_requests
 ├── events
 ├── webhook_subscriptions
 └── agent_memories
```

## 14. MVP Minimum Tables

To ship fastest, start with only these:

```text
companies
company_users
brand_kits
products
product_variants
campaigns
campaign_products
recipients
redemption_links
orders
order_items
budgets
approval_requests
events
agent_memories
```

Everything else can be metadata JSON until scale forces normalization.

[1]: https://docs.ainative.studio/ "Developer Documentation | AINative Studio Docs"
