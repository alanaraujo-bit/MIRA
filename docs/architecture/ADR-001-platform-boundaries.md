# ADR-001: Separate control, redirect, event, analytics and operations planes

Status: Accepted — 24 August 2026

Mira combines a rich multi-tenant management product with a globally reliable redirect path and high-volume event ingestion. Coupling these concerns would make dashboard releases a risk to permanent links.

The domain is divided into five explicit boundaries:

- Control plane: accounts, Workspaces, Links, Campaigns, Domains, rules, team and billing.
- Redirect plane: domain/slug resolution, compiled routing, cache, safety and fallback.
- Event plane: durable, idempotent click, conversion and custom-event ingestion.
- Analytics plane: enrichment, classification, aggregation and query projections.
- Operations plane: jobs, health, notifications, abuse review, audit, metering and administration.

Initial deployments may colocate boundaries while contracts and data ownership remain explicit. Physical separation happens when measured reliability, latency or load requires it.
