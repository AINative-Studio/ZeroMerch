/**
 * ZeroMerch ZeroDB Collection Types
 * TypeScript types for all 15 MVP collections defined in datamodel.md
 */

// ─── Core Tenant ────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  slug: string;
  domain: string;
  storefront_url?: string;
  logo_file_id?: string;
  brand_kit_id?: string;
  billing_customer_id?: string;
  default_currency: string;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
}

export interface CompanyUser {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  role: "admin" | "manager" | "employee" | "finance" | "vendor";
  department_id?: string;
  status: "active" | "inactive";
  sso_subject?: string;
  created_at: string;
}

// ─── Brand + Compliance ──────────────────────────────────────────────────────

export interface ComplianceRules {
  min_logo_clearspace?: string;
  allowed_backgrounds?: string[];
  restricted_products?: string[];
  [key: string]: unknown;
}

export interface BrandKit {
  id: string;
  company_id: string;
  name: string;
  primary_colors: string[];
  secondary_colors: string[];
  fonts: string[];
  logo_files: string[];
  approved_phrases: string[];
  restricted_phrases: string[];
  tone: string;
  compliance_rules: ComplianceRules;
  created_at: string;
  updated_at: string;
}

export type AssetType = "logo" | "icon" | "pattern" | "mockup" | "print_file";
export type AssetUsageStatus = "approved" | "pending" | "rejected";

export interface AssetMetadata {
  format: string;
  original_name: string;
  size_bytes: number;
  dimensions?: string;
  safe_for_print?: boolean;
  [key: string]: unknown;
}

export interface DesignAsset {
  id: string;
  company_id: string;
  brand_kit_id: string;
  file_id: string;
  asset_type: AssetType;
  usage_status: AssetUsageStatus;
  metadata: AssetMetadata;
  file_url?: string;
  created_by: string;
  created_at: string;
}

// ─── Commerce Catalog ────────────────────────────────────────────────────────

export interface Product {
  id: string;
  company_id: string;
  zerocommerce_product_id?: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  base_price: number;
  currency: string;
  vendor_id?: string;
  status: "active" | "inactive" | "draft";
  semantic_text?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  zerocommerce_variant_id?: string;
  sku: string;
  size?: string;
  color?: string;
  price: number;
  inventory_count: number;
  reorder_threshold: number;
  status: "active" | "inactive" | "out_of_stock";
}

// ─── Campaigns + Drops ───────────────────────────────────────────────────────

export type CampaignType =
  | "event_drop"
  | "onboarding"
  | "customer_gift"
  | "employee_store"
  | "vip_drop";

export type CampaignStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "archived";

export interface Campaign {
  id: string;
  company_id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  start_at?: string;
  end_at?: string;
  budget_id?: string;
  created_by: string;
  agent_generated: boolean;
  agent_prompt?: string;
  created_at: string;
}

export interface VariantRules {
  allow_sizes?: boolean;
  allow_colors?: string[];
  [key: string]: unknown;
}

export interface CampaignProduct {
  id: string;
  campaign_id: string;
  product_id: string;
  variant_rules: VariantRules;
  max_quantity_per_recipient: number;
  display_order: number;
}

export type RedemptionLinkStatus = "unused" | "used" | "expired" | "revoked";

export interface RedemptionLink {
  id: string;
  company_id: string;
  campaign_id: string;
  recipient_id: string;
  token_hash: string;
  status: RedemptionLinkStatus;
  credit_amount: number;
  expires_at?: string;
  created_at: string;
}

// ─── Recipients + Profiles ───────────────────────────────────────────────────

export type RecipientType =
  | "employee"
  | "customer"
  | "prospect"
  | "partner"
  | "investor"
  | "event_attendee";

export interface Recipient {
  id: string;
  company_id: string;
  type: RecipientType;
  email: string;
  full_name: string;
  external_ref?: string;
  department_id?: string;
  status: "active" | "inactive";
  created_at: string;
}

// ─── Orders + Redemption ─────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "paid"
  | "fulfilled"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaidBy =
  | "company_credit"
  | "recipient"
  | "department_budget"
  | "customer_success_budget";

export interface Order {
  id: string;
  company_id: string;
  campaign_id?: string;
  recipient_id: string;
  zerocommerce_order_id?: string;
  stripe_checkout_session_id?: string;
  status: OrderStatus;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  paid_by: PaidBy;
  created_at: string;
}

export interface ItemCustomization {
  logo_asset_id?: string;
  placement?: string;
  thread_color?: string;
  [key: string]: unknown;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  customization?: ItemCustomization;
}

// ─── Budgets + Governance ────────────────────────────────────────────────────

export type BudgetScope = "company" | "department" | "campaign" | "user";
export type BudgetPeriod = "monthly" | "quarterly" | "annual" | "campaign";

export interface Budget {
  id: string;
  company_id: string;
  name: string;
  owner_user_id: string;
  scope: BudgetScope;
  limit_amount: number;
  spent_amount: number;
  currency: string;
  period: BudgetPeriod;
  requires_approval_over: number;
  status: "active" | "inactive" | "exhausted";
}

export type ApprovalRequestType =
  | "order"
  | "campaign"
  | "design"
  | "budget_exception";
export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "escalated";

export interface ApprovalRequest {
  id: string;
  company_id: string;
  request_type: ApprovalRequestType;
  request_ref_id: string;
  requested_by: string;
  approver_user_id: string;
  status: ApprovalStatus;
  reason?: string;
  agent_recommendation?: "approve" | "reject" | "escalate";
  created_at: string;
  resolved_at?: string;
}

// ─── Events ──────────────────────────────────────────────────────────────────

export type EventType =
  | "campaign.created"
  | "order.paid"
  | "order.shipped"
  | "budget.exceeded"
  | "inventory.low"
  | "design.approved"
  | "redemption.used"
  | string;

export type ActorType = "user" | "agent" | "system" | "webhook";

export interface ZeroMerchEvent {
  id: string;
  company_id: string;
  event_type: EventType;
  actor_type: ActorType;
  actor_id: string;
  object_type: string;
  object_id: string;
  payload: Record<string, unknown>;
  processed: boolean;
  created_at: string;
}

// ─── Agent Memory ────────────────────────────────────────────────────────────

export type MemoryType = "working" | "episodic" | "semantic";

export interface AgentMemory {
  id: string;
  company_id: string;
  agent_name: string;
  memory_type: MemoryType;
  subject: string;
  content: string;
  entities: string[];
  importance: number;
  decay_score: number;
  source_ref?: string;
  created_at: string;
}

// ─── Generic operation types ─────────────────────────────────────────────────

/** Map collection name to its row type */
export interface CollectionTypeMap {
  companies: Company;
  company_users: CompanyUser;
  brand_kits: BrandKit;
  design_assets: DesignAsset;
  products: Product;
  product_variants: ProductVariant;
  campaigns: Campaign;
  campaign_products: CampaignProduct;
  recipients: Recipient;
  redemption_links: RedemptionLink;
  orders: Order;
  order_items: OrderItem;
  budgets: Budget;
  approval_requests: ApprovalRequest;
  events: ZeroMerchEvent;
  agent_memories: AgentMemory;
}

export type CollectionName = keyof CollectionTypeMap;

/** Generic filter for table queries */
export type QueryFilter = Record<string, unknown>;

/** ZeroDB API paginated response */
export interface ZeroDBPagedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

/** ZeroDB vector search result */
export interface VectorMatch {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

/** ZeroDB memory record */
export interface MemoryRecord {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

/** ZeroDB event record */
export interface EventRecord {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at?: string;
}
