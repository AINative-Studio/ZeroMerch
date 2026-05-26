# ZeroMerch

## AI-Native Corporate Merchandise Platform

### Powered by ZeroCommerce + ZeroDB + AIKit + AgentSwarm

---

# Overview

ZeroMerch is an AI-native enterprise merchandise platform that enables companies to:

* Launch branded employee merch stores
* Run event-based merch drops
* Automate customer gifting
* Manage budgets and approvals
* Coordinate fulfillment workflows
* Operate merch through AI agents

The platform is intentionally designed to minimize custom backend infrastructure by leveraging:

* ZeroCommerce APIs
* ZeroDB
* AIKit
* AgentSwarm
* AINative Models API
* Stripe
* Existing AINative event/webhook infrastructure

---

# Core Philosophy

> Configure more. Build less.

ZeroMerch uses the AINative ecosystem as composable primitives instead of building:

* Custom ecommerce infrastructure
* Custom vector databases
* Custom auth systems
* Custom workflow engines
* Custom AI orchestration layers

---

# Key Features

## Enterprise Storefronts

* Multi-tenant branded storefronts
* Employee merch portals
* Customer redemption experiences
* Event merch drops

---

## AI Merch Concierge

Natural-language merchandising workflows:

```bash
Create a premium onboarding kit for engineering hires under $150
```

```bash
Launch a merch drop for our GDC hackathon
```

```bash
Send gifts to customers with ARR over $25k
```

---

## Budget Governance

* Department-level merch budgets
* Approval workflows
* AI spending recommendations
* Budget enforcement

---

## AI Brand Compliance

AI agents validate:

* Logo placement
* Color usage
* Product restrictions
* Brand compliance
* Print readiness

---

## Agentic Operations

Agents manage:

* Campaign creation
* Product recommendations
* Inventory alerts
* Budget forecasting
* Vendor recommendations
* Semantic campaign retrieval

---

# Platform Architecture

```text
┌─────────────────────┐
│      Frontend       │
│  Next.js + AIKit    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  ZeroCommerce APIs  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│       ZeroDB        │
│ Tables + Vectors    │
│ Memory + Events     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    AgentSwarm       │
│  AI Orchestration   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ AINative Models API │
└─────────────────────┘
```

---

# Tech Stack

| Layer          | Technology          |
| -------------- | ------------------- |
| Frontend       | Next.js             |
| UI System      | AIKit               |
| Styling        | Tailwind            |
| Database       | ZeroDB              |
| Vector Search  | ZeroDB              |
| Memory         | ZeroMemory          |
| AI Agents      | AgentSwarm          |
| AI Models      | AINative Models API |
| Ecommerce      | ZeroCommerce        |
| Payments       | Stripe              |
| Authentication | AINative Auth       |
| Hosting        | Vercel / Docker     |
| CI/CD          | GitHub Actions      |

---

# Repository Structure

```text
zeromerch/
├── apps/
│   ├── web/
│   ├── admin/
│   └── storefront/
│
├── packages/
│   ├── ui/
│   ├── agents/
│   ├── zerodb/
│   ├── zerocommerce/
│   ├── auth/
│   ├── memory/
│   ├── analytics/
│   └── shared/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── prompts/
│   ├── schemas/
│   └── workflows/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── bdd/
│   └── e2e/
│
├── scripts/
├── docker/
├── .github/
└── README.md
```

---

# Monorepo Strategy

## apps/web

Primary marketing + application shell.

---

## apps/admin

Enterprise management dashboard.

Features:

* Budgets
* Campaigns
* Users
* Vendors
* Analytics
* AI operations

---

## apps/storefront

Employee/customer storefront experience.

---

## packages/ui

Reusable AIKit UI components.

---

## packages/agents

Agent workflows:

* Merch Concierge
* Budget Agent
* Brand Compliance Agent
* Inventory Agent

---

## packages/zerodb

ZeroDB SDK abstraction layer.

---

## packages/zerocommerce

Commerce integration layer.

---

# Environment Variables

```env
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_API_URL=

ZERODB_API_KEY=
ZERODB_PROJECT_ID=

ZEROCOMMERCE_API_KEY=
ZEROCOMMERCE_BASE_URL=

AINATIVE_MODELS_API_KEY=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

AUTH_SECRET=

OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

---

# Local Development

## Install Dependencies

```bash
pnpm install
```

---

## Start Development

```bash
pnpm dev
```

---

## Run Admin App

```bash
pnpm dev:admin
```

---

## Run Storefront

```bash
pnpm dev:storefront
```

---

# Database Strategy

ZeroDB is the primary data plane.

Used for:

* Relational tables
* Vector search
* Semantic retrieval
* Agent memory
* Events
* File storage
* Embeddings

---

# Core Collections

| Collection     | Purpose                  |
| -------------- | ------------------------ |
| companies      | Tenant management        |
| company_users  | Authentication + RBAC    |
| products       | Merch catalog            |
| campaigns      | Merch drops              |
| budgets        | Spend governance         |
| orders         | Transactions             |
| redemptions    | Employee/customer claims |
| events         | Event sourcing           |
| agent_memories | Long-term AI memory      |

---

# AI Agent System

## Merch Concierge Agent

Handles:

* Campaign creation
* Product recommendations
* Merch planning

---

## Budget Agent

Handles:

* Spend forecasting
* Approval routing
* Budget enforcement

---

## Brand Compliance Agent

Handles:

* Logo validation
* Print compliance
* Brand governance

---

## Inventory Agent

Handles:

* Low inventory alerts
* Reorder suggestions
* Vendor optimization

---

# Semantic Search

ZeroDB semantic retrieval enables:

```bash
Find our best developer conference merch
```

```bash
Show campaigns similar to GDC 2026
```

```bash
Recommend premium onboarding kits
```

---

# Event-Driven Architecture

Core event examples:

```text
campaign.created
campaign.activated
order.paid
order.shipped
budget.exceeded
inventory.low
design.approved
redemption.used
```

---

# API Strategy

The platform minimizes custom backend endpoints.

Primary logic exists in:

* ZeroCommerce APIs
* ZeroDB collections
* Agent workflows
* Webhook orchestration

---

# Security

## Multi-Tenant Isolation

Every collection includes:

```json
{
  "company_id": "tenant_uuid"
}
```

---

## RBAC

Supported roles:

* Admin
* Manager
* Employee
* Finance
* Vendor

---

# Testing Strategy

## Required Coverage

* Unit tests
* Integration tests
* BDD workflows
* E2E tests

---

## Commands

```bash
pnpm test
```

```bash
pnpm test:e2e
```

```bash
pnpm test:bdd
```

---

# AI-Native Development Standards

The repository follows:

* Semantic Seed Coding Standards V2.0
* TDD-first workflows
* BDD acceptance testing
* Agent-compatible architecture
* AI pair programming conventions

---

# Definition of Done

Every PR must include:

* Tests
* Documentation
* Audit logging
* Error handling
* Accessibility validation
* Mobile responsiveness
* AI agent execution notes

---

# CI/CD

GitHub Actions pipeline includes:

* Linting
* Type checking
* Unit tests
* Integration tests
* Build validation
* Security scanning

---

# Deployment

## Recommended Stack

| Layer    | Provider     |
| -------- | ------------ |
| Frontend | Vercel       |
| APIs     | AINative     |
| Database | ZeroDB       |
| Storage  | ZeroDB Files |
| Payments | Stripe       |

---

# Roadmap

## Phase 1

* Enterprise storefronts
* Checkout
* Redemption links
* Campaigns
* AI concierge

---

## Phase 2

* AI-generated merch design
* Vendor marketplace
* Predictive inventory
* CRM integrations

---

## Phase 3

* Autonomous merch operations
* AI procurement negotiation
* Dynamic pricing
* Personalized merch recommendations

---

# Competitive Advantage

ZeroMerch is not just a merch platform.

It is:

* AI-native
* Agent-driven
* Memory-enabled
* Semantic-search powered
* Built almost entirely from composable infrastructure

This dramatically reduces:

* Development cost
* Backend complexity
* Operational overhead
* Time-to-market

while increasing:

* Automation
* Intelligence
* Scalability
* Enterprise customization

---

# Product Thesis

> The future of enterprise commerce is agentic.

ZeroMerch demonstrates how AI-native infrastructure can replace large portions of traditional SaaS architecture with intelligent composable systems powered by:

* ZeroDB
* ZeroCommerce
* AIKit
* AgentSwarm
* AINative Models API

---

# Useful Links

## AINative

[AINative Studio](https://ainative.studio?utm_source=chatgpt.com)

## ZeroDB

[ZeroDB Docs](https://docs.ainative.studio?utm_source=chatgpt.com)

## AIKit

[AIKit](https://ainative.studio/ai-kit?utm_source=chatgpt.com)

## Models API

[AINative Models](https://ainative.studio/models?utm_source=chatgpt.com)

## ZeroCommerce

[AINative Docs](https://docs.ainative.studio?utm_source=chatgpt.com)
