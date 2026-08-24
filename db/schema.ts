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

export const links = sqliteTable("links", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  destinationUrl: text("destination_url").notNull(),
  slug: text("slug").notNull(),
  status: text("status", { enum: ["active", "archived", "blocked"] }).notNull().default("active"),
  createdByUserId: text("created_by_user_id").notNull().references(() => users.id),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_links_slug").on(table.slug),
  index("idx_links_workspace_updated").on(table.workspaceId, table.updatedAt),
  index("idx_links_workspace_status").on(table.workspaceId, table.status),
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
