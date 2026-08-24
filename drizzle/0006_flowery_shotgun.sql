ALTER TABLE `click_events` ADD `country_code` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `click_events` ADD `region_code` text;--> statement-breakpoint
ALTER TABLE `click_events` ADD `language_code` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `click_events` ADD `os_family` text DEFAULT 'Unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `click_events` ADD `browser_family` text DEFAULT 'Unknown' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_click_events_workspace_country_time` ON `click_events` (`workspace_id`,`country_code`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_click_events_workspace_os_time` ON `click_events` (`workspace_id`,`os_family`,`occurred_at`);