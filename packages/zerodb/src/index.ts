/**
 * @zeromerch/zerodb
 *
 * ZeroDB SDK abstraction layer for ZeroMerch.
 * Single source of truth for all data persistence across the platform.
 *
 * @example
 * ```ts
 * import { ZeroDBClient } from "@zeromerch/zerodb";
 *
 * const db = new ZeroDBClient();
 *
 * // Table operations
 * const companiesTable = db.table("companies");
 * const company = await companiesTable.insert({ name: "Acme AI", ... });
 *
 * // Vector search
 * const vectors = db.vector("product_embeddings");
 * const results = await vectors.search(queryEmbedding, 10);
 *
 * // Memory
 * const mem = db.memory();
 * await mem.store({ content: "Acme prefers black hoodies", metadata: {} });
 *
 * // Events
 * const evts = db.events();
 * await evts.emit("order.paid", { order_id: "...", total: 115.50 });
 * ```
 */

// Client
export { ZeroDBClient } from "./client.js";
export type {
  ZeroDBClientConfig,
  TableClient,
  VectorClient,
  MemoryClient,
  EventsClient,
} from "./client.js";

// Types — all 15 MVP collections
export type {
  // Core tenant
  Company,
  CompanyUser,
  Department,
  // Brand
  BrandKit,
  ComplianceRules,
  DesignAsset,
  AssetType,
  AssetUsageStatus,
  AssetMetadata,
  // Catalog
  Product,
  ProductVariant,
  ProductCollection,
  CollectionVisibility,
  // Campaigns
  Campaign,
  CampaignProduct,
  CampaignType,
  CampaignStatus,
  RedemptionLink,
  RedemptionLinkStatus,
  VariantRules,
  // Recipients
  Recipient,
  RecipientType,
  // Orders
  Order,
  OrderItem,
  OrderStatus,
  PaidBy,
  ItemCustomization,
  // Budgets
  Budget,
  BudgetScope,
  BudgetPeriod,
  ApprovalRequest,
  ApprovalRequestType,
  ApprovalStatus,
  // Events
  ZeroMerchEvent,
  EventType,
  ActorType,
  // Memory
  AgentMemory,
  MemoryType,
  // Generic
  CollectionName,
  CollectionTypeMap,
  QueryFilter,
  ZeroDBPagedResponse,
  VectorMatch,
  MemoryRecord,
  EventRecord,
} from "./types.js";

// Errors
export {
  ZeroDBError,
  ZeroDBValidationError,
  ZeroDBAuthError,
  ZeroDBForbiddenError,
  ZeroDBNotFoundError,
  ZeroDBConflictError,
  ZeroDBRateLimitError,
  ZeroDBServerError,
  ZeroDBConfigError,
  mapStatusToError,
} from "./errors.js";

// Schema
export {
  initSchema,
  TABLE_COLLECTIONS,
  VECTOR_COLLECTIONS,
  ALL_COLLECTIONS,
} from "./schema.js";
export type { CollectionSchema, FieldDef } from "./schema.js";
