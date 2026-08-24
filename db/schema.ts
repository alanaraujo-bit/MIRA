import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  ownerUserId: text("owner_user_id").notNull().references(() => users.id),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_workspaces_slug").on(table.slug),
  index("idx_workspaces_owner").on(table.ownerUserId),
]);

export const workspaceMembers = sqliteTable("workspace_members", {
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["owner", "admin", "editor", "viewer"] }).notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.workspaceId, table.userId] }),
  index("idx_workspace_members_user").on(table.userId),
]);

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  objective: text("objective"),
  status: text("status", { enum: ["planning", "active", "ended"] }).notNull().default("active"),
  startsAt: integer("starts_at"),
  endsAt: integer("ends_at"),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  index("idx_campaigns_workspace_updated").on(table.workspaceId, table.updatedAt),
  index("idx_campaigns_workspace_status").on(table.workspaceId, table.status),
]);

export const links = sqliteTable("links", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  destinationUrl: text("destination_url").notNull(),
  slug: text("slug").notNull(),
  campaignId: text("campaign_id").references(() => campaigns.id, { onDelete: "set null" }),
  channel: text("channel"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),
  status: text("status", { enum: ["active", "archived", "blocked"] }).notNull().default("active"),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_links_slug").on(table.slug),
  index("idx_links_workspace_updated").on(table.workspaceId, table.updatedAt),
  index("idx_links_workspace_status").on(table.workspaceId, table.status),
  index("idx_links_workspace_campaign").on(table.workspaceId, table.campaignId),
]);

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  uniqueIndex("idx_tags_workspace_normalized").on(table.workspaceId, table.normalizedName),
]);

export const linkTags = sqliteTable("link_tags", {
  linkId: text("link_id").notNull().references(() => links.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.linkId, table.tagId] }),
  index("idx_link_tags_tag").on(table.tagId),
]);

export const clickEvents = sqliteTable("click_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  linkId: text("link_id").notNull().references(() => links.id, { onDelete: "cascade" }),
  referrerHost: text("referrer_host"),
  deviceClass: text("device_class", { enum: ["mobile", "desktop", "bot", "unknown"] }).notNull(),
  occurredAt: integer("occurred_at").notNull(),
}, (table) => [
  index("idx_click_events_workspace_time").on(table.workspaceId, table.occurredAt),
  index("idx_click_events_link_time").on(table.linkId, table.occurredAt),
]);
