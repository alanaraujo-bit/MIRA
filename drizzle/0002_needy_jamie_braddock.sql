CREATE TABLE `link_favorites` (
	`link_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`link_id`, `user_id`),
	FOREIGN KEY (`link_id`) REFERENCES `links`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_link_favorites_user_created` ON `link_favorites` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `utm_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`source` text,
	`medium` text,
	`campaign` text,
	`content` text,
	`term` text,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_utm_presets_workspace_normalized` ON `utm_presets` (`workspace_id`,`normalized_name`);--> statement-breakpoint
CREATE INDEX `idx_utm_presets_workspace_updated` ON `utm_presets` (`workspace_id`,`updated_at`);--> statement-breakpoint
DROP INDEX `idx_links_workspace_updated`;--> statement-breakpoint
CREATE INDEX `idx_links_workspace_updated_id` ON `links` (`workspace_id`,`updated_at`,`id`);