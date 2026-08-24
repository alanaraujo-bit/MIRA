import postgres, { type Sql } from "postgres";

type QueryResult<T> = { results: T[] };
type RunResult = { meta: { changes: number } };

function sqlParameters(values: unknown[]): never[] {
  return values as never[];
}

const globalDatabase = globalThis as typeof globalThis & { miraPostgres?: Sql };
let schemaReady: Promise<void> | null = null;

function client(): Sql {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is unavailable");
  globalDatabase.miraPostgres ??= postgres(connectionString, {
    max: 4,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: /@(localhost|127\.0\.0\.1)(:|\/)/.test(connectionString) ? false : "require",
    types: {
      bigint: { to: 20, from: [20], serialize: (value: number) => String(value), parse: (value: string) => Number(value) },
    },
  });
  return globalDatabase.miraPostgres;
}

function placeholders(query: string): string {
  let index = 0;
  return query.replace(/\?/g, () => `$${++index}`);
}

function translate(query: string): string {
  let translated = query.trim().replace(/;$/, "");
  const ignore = /^INSERT\s+OR\s+IGNORE\s+INTO\s+/i.test(translated);
  if (ignore) translated = translated.replace(/^INSERT\s+OR\s+IGNORE\s+INTO\s+/i, "INSERT INTO ");
  translated = translated.replace(/GROUP_CONCAT\(t\.name,\s*char\(31\)\)/gi, "STRING_AGG(t.name, chr(31))");
  if (ignore && !/\bON\s+CONFLICT\b/i.test(translated)) translated += " ON CONFLICT DO NOTHING";
  return placeholders(translated);
}

class PreparedStatement {
  readonly query: string;
  readonly values: unknown[];

  constructor(query: string, values: unknown[] = []) {
    this.query = translate(query);
    this.values = values;
  }

  bind(...values: unknown[]) {
    return new PreparedStatement(this.query.replace(/\$(\d+)/g, "?"), values);
  }

  async run(): Promise<RunResult> {
    const result = await client().unsafe(this.query, sqlParameters(this.values));
    return { meta: { changes: result.count ?? 0 } };
  }

  async all<T>(): Promise<QueryResult<T>> {
    const result = await client().unsafe<T[]>(this.query, sqlParameters(this.values));
    return { results: [...result] };
  }

  async first<T>(): Promise<T | null> {
    const result = await client().unsafe<T[]>(this.query, sqlParameters(this.values));
    return result[0] ?? null;
  }
}

class PostgresDatabase {
  prepare(query: string) { return new PreparedStatement(query); }

  async batch(statements: PreparedStatement[]): Promise<RunResult[]> {
    return client().begin(async (transaction) => {
      const results: RunResult[] = [];
      for (const statement of statements) {
        const result = await transaction.unsafe(statement.query, sqlParameters(statement.values));
        results.push({ meta: { changes: result.count ?? 0 } });
      }
      return results;
    });
  }
}

const databaseInstance = new PostgresDatabase();

export function database(): D1Database {
  return databaseInstance as unknown as D1Database;
}

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL, display_name TEXT,
    password_hash TEXT, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email))`,
  `CREATE TABLE IF NOT EXISTS user_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at BIGINT NOT NULL, created_at BIGINT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_user_sessions_expiry ON user_sessions(expires_at)`,
  `CREATE TABLE IF NOT EXISTS auth_rate_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL,
    window_started_at BIGINT NOT NULL, updated_at BIGINT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL,
    owner_user_id TEXT NOT NULL REFERENCES users(id), created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug)`,
  `CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_user_id)`,
  `CREATE TABLE IF NOT EXISTS workspace_members (workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL, created_at BIGINT NOT NULL,
    PRIMARY KEY (workspace_id, user_id))`,
  `CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id)`,
  `CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL, objective TEXT, status TEXT DEFAULT 'active' NOT NULL, starts_at BIGINT, ends_at BIGINT,
    created_by_user_id TEXT NOT NULL REFERENCES users(id), created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_campaigns_workspace_updated ON campaigns(workspace_id, updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_campaigns_workspace_status ON campaigns(workspace_id, status)`,
  `CREATE TABLE IF NOT EXISTS domains (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    hostname TEXT NOT NULL, verification_token TEXT NOT NULL, status TEXT DEFAULT 'pending' NOT NULL,
    dns_status TEXT DEFAULT 'pending' NOT NULL, ssl_status TEXT DEFAULT 'pending' NOT NULL, last_error TEXT,
    verified_at BIGINT, last_checked_at BIGINT, created_by_user_id TEXT NOT NULL REFERENCES users(id),
    created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_domains_hostname ON domains(hostname)`,
  `CREATE INDEX IF NOT EXISTS idx_domains_workspace_updated ON domains(workspace_id, updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_domains_workspace_status ON domains(workspace_id, status)`,
  `CREATE TABLE IF NOT EXISTS links (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL, destination_url TEXT NOT NULL, slug TEXT NOT NULL,
    domain_id TEXT REFERENCES domains(id) ON DELETE SET NULL, campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
    channel TEXT, utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT,
    status TEXT DEFAULT 'active' NOT NULL, created_by_user_id TEXT NOT NULL REFERENCES users(id),
    created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_links_slug ON links(slug)`,
  `CREATE INDEX IF NOT EXISTS idx_links_workspace_updated_id ON links(workspace_id, updated_at, id)`,
  `CREATE INDEX IF NOT EXISTS idx_links_workspace_status ON links(workspace_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_links_workspace_campaign ON links(workspace_id, campaign_id)`,
  `CREATE INDEX IF NOT EXISTS idx_links_workspace_domain ON links(workspace_id, domain_id)`,
  `CREATE TABLE IF NOT EXISTS click_events (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE, referrer_host TEXT, device_class TEXT NOT NULL,
    session_id_hash TEXT, country_code TEXT NOT NULL DEFAULT 'unknown', region_code TEXT,
    language_code TEXT NOT NULL DEFAULT 'unknown', os_family TEXT NOT NULL DEFAULT 'Unknown',
    browser_family TEXT NOT NULL DEFAULT 'Unknown', occurred_at BIGINT NOT NULL)`,
  `ALTER TABLE click_events ADD COLUMN IF NOT EXISTS session_id_hash TEXT`,
  `ALTER TABLE click_events ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'unknown'`,
  `ALTER TABLE click_events ADD COLUMN IF NOT EXISTS region_code TEXT`,
  `ALTER TABLE click_events ADD COLUMN IF NOT EXISTS language_code TEXT NOT NULL DEFAULT 'unknown'`,
  `ALTER TABLE click_events ADD COLUMN IF NOT EXISTS os_family TEXT NOT NULL DEFAULT 'Unknown'`,
  `ALTER TABLE click_events ADD COLUMN IF NOT EXISTS browser_family TEXT NOT NULL DEFAULT 'Unknown'`,
  `CREATE INDEX IF NOT EXISTS idx_click_events_workspace_time ON click_events(workspace_id, occurred_at)`,
  `CREATE INDEX IF NOT EXISTS idx_click_events_link_time ON click_events(link_id, occurred_at)`,
  `CREATE INDEX IF NOT EXISTS idx_click_events_workspace_session_time ON click_events(workspace_id, session_id_hash, occurred_at)`,
  `CREATE INDEX IF NOT EXISTS idx_click_events_workspace_country_time ON click_events(workspace_id, country_code, occurred_at)`,
  `CREATE INDEX IF NOT EXISTS idx_click_events_workspace_os_time ON click_events(workspace_id, os_family, occurred_at)`,
  `CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL, normalized_name TEXT NOT NULL, created_at BIGINT NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_workspace_normalized ON tags(workspace_id, normalized_name)`,
  `CREATE TABLE IF NOT EXISTS link_tags (link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY (link_id, tag_id))`,
  `CREATE INDEX IF NOT EXISTS idx_link_tags_tag ON link_tags(tag_id)`,
  `CREATE TABLE IF NOT EXISTS link_favorites (link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at BIGINT NOT NULL, PRIMARY KEY (link_id, user_id))`,
  `CREATE INDEX IF NOT EXISTS idx_link_favorites_user_created ON link_favorites(user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS utm_presets (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL, normalized_name TEXT NOT NULL, source TEXT, medium TEXT, campaign TEXT, content TEXT, term TEXT,
    created_by_user_id TEXT NOT NULL REFERENCES users(id), created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_utm_presets_workspace_normalized ON utm_presets(workspace_id, normalized_name)`,
  `CREATE INDEX IF NOT EXISTS idx_utm_presets_workspace_updated ON utm_presets(workspace_id, updated_at)`,
];

export async function ensurePlatformSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    for (const statement of schemaStatements) await client().unsafe(statement);
  })().catch((error) => { schemaReady = null; throw error; });
  return schemaReady;
}

export async function rawQuery<T>(query: string, values: unknown[] = []): Promise<T[]> {
  await ensurePlatformSchema();
  return [...await client().unsafe<T[]>(placeholders(query), sqlParameters(values))];
}
