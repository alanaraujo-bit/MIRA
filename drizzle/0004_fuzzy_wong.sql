ALTER TABLE `links` ADD `domain_id` text REFERENCES domains(id) ON DELETE SET NULL;--> statement-breakpoint
CREATE INDEX `idx_links_workspace_domain` ON `links` (`workspace_id`,`domain_id`);
