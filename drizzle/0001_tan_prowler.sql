CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`objective` text,
	`status` text DEFAULT 'active' NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_campaigns_workspace_updated` ON `campaigns` (`workspace_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_campaigns_workspace_status` ON `campaigns` (`workspace_id`,`status`);--> statement-breakpoint
CREATE TABLE `link_tags` (
	`link_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`link_id`, `tag_id`),
	FOREIGN KEY (`link_id`) REFERENCES `links`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_link_tags_tag` ON `link_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tags_workspace_normalized` ON `tags` (`workspace_id`,`normalized_name`);--> statement-breakpoint
ALTER TABLE `links` ADD `campaign_id` text REFERENCES campaigns(id);--> statement-breakpoint
ALTER TABLE `links` ADD `channel` text;--> statement-breakpoint
ALTER TABLE `links` ADD `utm_source` text;--> statement-breakpoint
ALTER TABLE `links` ADD `utm_medium` text;--> statement-breakpoint
ALTER TABLE `links` ADD `utm_campaign` text;--> statement-breakpoint
ALTER TABLE `links` ADD `utm_content` text;--> statement-breakpoint
ALTER TABLE `links` ADD `utm_term` text;--> statement-breakpoint
CREATE INDEX `idx_links_workspace_campaign` ON `links` (`workspace_id`,`campaign_id`);