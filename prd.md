# ZeroMerch by AINative

## Product Requirements Document (PRD)

### Version 1.0 — Lean API-First Agentic Commerce Platform

---

# 1. Executive Summary

ZeroMerch is an AI-native corporate merchandise management platform built almost entirely on top of existing AINative infrastructure:

* ZeroCommerce APIs
* ZeroDB
* AIKit
* AINative Auth
* AINative Models API
* AgentSwarm
* Stripe integrations
* Existing webhook/event systems

The primary objective is to create a production-ready enterprise merch platform with the **least amount of custom code possible** by leveraging existing backend primitives and agentic workflows.

The system enables companies to:

* Launch branded employee/customer merch stores
* Automate gifting and onboarding
* Manage inventory and approvals
* Trigger merch campaigns via AI agents
* Run event-based merch drops
* Govern merch budgets and redemption credits

---

# 2. Product Vision

> “The AI-native operating system for corporate merchandise.”

Instead of manually managing swag, spreadsheets, vendors, approvals, and fulfillment, companies interact with merch through intelligent agents.

Examples:

* “Launch onboarding kits for all new hires.”
* “Send hoodies to top customers.”
* “Create a temporary merch drop for GDC.”
* “Keep engineering swag under $15k quarterly.”

---

# 3. Strategic Goal

Build a scalable SaaS platform while writing minimal infrastructure code.

AINative infrastructure already provides:

| Capability      | Existing Platform                     |
| --------------- | ------------------------------------- |
| Authentication  | AINative Auth                         |
| Database        | ZeroDB                                |
| Memory          | ZeroDB Memory                         |
| Semantic Search | ZeroDB Hybrid Search                  |
| API Layer       | ZeroCommerce APIs                     |
| Agent Framework | AgentSwarm                            |
| UI Components   | AIKit                                 |
| Checkout        | Stripe                                |
| Vector Search   | ZeroDB                                |
| Realtime Events | Existing webhook/event infrastructure |
| AI Generation   | AINative Models API                   |

---

# 4. Design Philosophy

## Primary Principle

> “Configure more. Build less.”

The platform should primarily consist of:

* Configuration
* AI orchestration
* Workflow composition
* UI assembly using AIKit

NOT:

* Heavy backend engineering
* Custom infrastructure
* Custom commerce engines
* Custom auth systems

---

# 5. Core Features

## 5.1 Multi-Tenant Corporate Stores

Each company receives:

* Dedicated branded storefront
* Custom subdomain
* Product collections
* Employee/customer access controls
* Budget rules
* Department segmentation

### Powered By

* ZeroCommerce Products API
* ZeroDB tenant isolation
* AIKit storefront components

---

## 5.2 AI Merch Concierge

Natural language merch management.

### Example Prompts

* “Create a premium founder welcome kit.”
* “Generate a swag collection for our AI summit.”
* “Send gifts to customers over $10k ARR.”

### AI Workflow

1. User prompt
2. AgentSwarm orchestration
3. Product retrieval via ZeroCommerce
4. Budget validation via ZeroDB
5. Collection/store creation
6. Checkout/redeem flow generation

### Powered By

* AgentSwarm
* AINative Models API
* ZeroDB Memory

---

## 5.3 Employee Redemption System

Employees receive:

* Merch credits
* Redemption links
* SSO access
* Size preferences
* Department-based catalogs

### Minimal Custom Logic

Credits and balances stored in ZeroDB.

Checkout handled entirely by ZeroCommerce + Stripe.

---

## 5.4 Customer Gifting Automation

CRM/webhook-triggered gifting.

### Example

When:

* Salesforce deal closes
* HubSpot lifecycle changes
* Stripe customer upgrades

Then:

* Automatically generate merch package
* Send redemption link
* Track delivery status

### Powered By

* Existing webhook systems
* Agent workflows
* ZeroCommerce orders

---

## 5.5 Brand Governance Agent

AI validates:

* Logo usage
* Approved colors
* Product restrictions
* Vendor compliance
* Event branding rules

### Powered By

* AIKit design systems
* AINative Models API
* Stored brand rules in ZeroDB

---

## 5.6 Event Merch Drops

Temporary event storefronts.

### Example Use Cases

* Conferences
* Hackathons
* Retreats
* Customer summits
* Product launches

### Features

* Time-based expiration
* QR code access
* Limited inventory
* Invite-only access

---

# 6. Technical Architecture

## 6.1 Frontend Stack

### Primary Goal

Assemble using AIKit components.

### Stack

* Next.js
* AIKit
* Tailwind
* Minimal custom UI

### Major Components

| Component     | Source                 |
| ------------- | ---------------------- |
| Product Grid  | AIKit                  |
| Checkout      | ZeroCommerce           |
| Auth          | AINative Auth          |
| Dashboard     | AIKit                  |
| Agent Chat UI | AIKit                  |
| Search        | ZeroDB Semantic Search |

---

## 6.2 Backend Strategy

### Rule

Avoid writing backend services unless absolutely necessary.

Primary architecture:

```text
Frontend
↓
ZeroCommerce APIs
↓
ZeroDB
↓
Webhook/Event Layer
↓
AgentSwarm
```

---

## 6.3 Data Layer

## ZeroDB Collections

### Companies

```json
{
  "name": "",
  "brand_kit": {},
  "budgets": {},
  "settings": {}
}
```

### Products

Synced from ZeroCommerce.

### Campaigns

```json
{
  "type": "event_drop",
  "budget": 5000,
  "status": "active"
}
```

### Redemptions

```json
{
  "employee_id": "",
  "credits_used": 120,
  "order_id": ""
}
```

### Agent Memory

Stored in ZeroDB memory layer.

---

# 7. API Utilization Strategy

## Existing APIs to Leverage

| API          | Usage                    |
| ------------ | ------------------------ |
| Products API | Catalog                  |
| Orders API   | Checkout                 |
| Checkout API | Stripe integration       |
| Webhooks API | Automation               |
| Search API   | Semantic merch retrieval |
| Auth APIs    | Multi-tenant auth        |
| Models API   | AI orchestration         |

---

# 8. AI Agent System

## Primary Agents

### Merch Concierge Agent

Handles:

* Merch creation
* Recommendations
* Collection generation

---

### Budget Agent

Handles:

* Spend limits
* Department allocations
* Approval routing

---

### Brand Compliance Agent

Handles:

* Design approvals
* Policy validation
* Product restrictions

---

### Inventory Agent

Handles:

* Reorders
* Forecasting
* Vendor recommendations

---

# 9. MVP Scope

## Phase 1 — 4-6 Weeks

### Must Have

* Multi-tenant storefronts
* Product catalog
* Employee redemption
* Stripe checkout
* Basic admin dashboard
* AI merch concierge
* Event drops
* ZeroDB integration

### Explicitly Excluded

* Custom inventory system
* Custom fulfillment engine
* Native CRM integrations
* Advanced analytics
* Multi-vendor logistics engine

---

# 10. Lowest-Code Strategy

## Target

### Write Less Than:

* 5 custom backend services
* 25 database tables/collections
* 15 custom API endpoints

Most logic should exist inside:

* AI workflows
* Webhook orchestration
* ZeroDB schemas
* AIKit frontend assembly

---

# 11. Revenue Model

## SaaS Pricing

### Starter

* Small teams
* Basic storefront
* AI concierge

### Growth

* Budget governance
* Multi-department
* Event drops

### Enterprise

* Advanced workflows
* Custom branding
* Dedicated vendors
* Agent customization

---

# 12. Competitive Positioning

| Competitor               | Weakness                        |
| ------------------------ | ------------------------------- |
| Printful                 | Not enterprise workflow focused |
| Swag.com                 | Not AI-native                   |
| Shopify                  | Generic commerce                |
| Corporate merch agencies | Manual workflows                |
| Sendoso                  | Limited storefront flexibility  |

---

# 13. Key Differentiator

> “Merch managed by agents, not operations teams.”

---

# 14. Future Roadmap

## Phase 2

* AI-generated merch designs
* Vendor marketplace
* Dynamic pricing
* Predictive inventory
* Multi-language storefronts

---

## Phase 3

* Autonomous merch operations
* AI procurement negotiation
* On-demand event merchandising
* Personalized employee merch recommendations

---

# 15. Success Metrics

| Metric                       | Goal        |
| ---------------------------- | ----------- |
| Time to launch store         | <10 minutes |
| Backend code reduction       | 80% less    |
| AI-managed workflows         | >70%        |
| Average merch campaign setup | <5 minutes  |
| Enterprise onboarding        | <1 day      |

---

# 16. Final Product Thesis

ZeroMerch demonstrates the power of the AINative ecosystem itself.

The product becomes a live showcase of:

* ZeroCommerce
* ZeroDB
* AIKit
* AgentSwarm
* AINative Models
* AI-native product development

while proving that modern SaaS products can be built with dramatically less code through intelligent infrastructure composition.
