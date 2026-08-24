CREATE TABLE `domains` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`hostname` text NOT NULL,
	`verification_token` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`dns_status` text DEFAULT 'pending' NOT NULL,
	`ssl_status` text DEFAULT 'pending' NOT NULL,
	`last_error` text,
	`verified_at` integer,
	`last_checked_at` integer,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_domains_hostname` ON `domains` (`hostname`);--> statement-breakpoint
CREATE INDEX `idx_domains_workspace_updated` ON `domains` (`workspace_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_domains_workspace_status` ON `domains` (`workspace_id`,`status`);