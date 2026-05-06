import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

/**
 * Migration: create the 8 analytics/tracked/llm tables that exist in the
 * Payload schema but were never actually created in production D1.
 *
 * These collections were added in commit 6c281c5 ("Port analytics module:
 * GA4 + GSC + DataForSEO + LLM mention tracking") without a corresponding
 * migration file, so the schema declared them but the tables never landed.
 * The previous migration (20260504_220000) added FK references on
 * payload_locked_documents_rels pointing at these tables — those FKs are now
 * dangling, breaking any query that touches the lock table.
 *
 * Hand-written rather than auto-generated because the .json snapshot
 * history is out of sync with production state — see the discarded
 * 641-line auto-gen file in this commit.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // analytics_ga4_snapshots
  await db.run(sql`CREATE TABLE \`analytics_ga4_snapshots\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`snapshot_date\` text NOT NULL,
    \`sessions\` numeric DEFAULT 0,
    \`users\` numeric DEFAULT 0,
    \`new_users\` numeric DEFAULT 0,
    \`pageviews\` numeric DEFAULT 0,
    \`bounce_rate\` numeric,
    \`avg_session_duration\` numeric,
    \`conversions\` numeric DEFAULT 0,
    \`top_pages\` text,
    \`top_sources\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)
  await db.run(sql`CREATE UNIQUE INDEX \`analytics_ga4_snapshots_snapshot_date_idx\` ON \`analytics_ga4_snapshots\` (\`snapshot_date\`);`)
  await db.run(sql`CREATE INDEX \`analytics_ga4_snapshots_updated_at_idx\` ON \`analytics_ga4_snapshots\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`analytics_ga4_snapshots_created_at_idx\` ON \`analytics_ga4_snapshots\` (\`created_at\`);`)

  // analytics_gsc_snapshots
  await db.run(sql`CREATE TABLE \`analytics_gsc_snapshots\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`snapshot_date\` text NOT NULL,
    \`impressions\` numeric DEFAULT 0,
    \`clicks\` numeric DEFAULT 0,
    \`ctr\` numeric,
    \`avg_position\` numeric,
    \`top_queries\` text,
    \`top_pages\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)
  await db.run(sql`CREATE UNIQUE INDEX \`analytics_gsc_snapshots_snapshot_date_idx\` ON \`analytics_gsc_snapshots\` (\`snapshot_date\`);`)
  await db.run(sql`CREATE INDEX \`analytics_gsc_snapshots_updated_at_idx\` ON \`analytics_gsc_snapshots\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`analytics_gsc_snapshots_created_at_idx\` ON \`analytics_gsc_snapshots\` (\`created_at\`);`)

  // analytics_keyword_rankings
  await db.run(sql`CREATE TABLE \`analytics_keyword_rankings\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`snapshot_date\` text NOT NULL,
    \`keyword\` text NOT NULL,
    \`location\` text,
    \`position\` numeric,
    \`url\` text,
    \`search_volume\` numeric,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)
  await db.run(sql`CREATE INDEX \`analytics_keyword_rankings_snapshot_date_idx\` ON \`analytics_keyword_rankings\` (\`snapshot_date\`);`)
  await db.run(sql`CREATE INDEX \`analytics_keyword_rankings_keyword_idx\` ON \`analytics_keyword_rankings\` (\`keyword\`);`)
  await db.run(sql`CREATE INDEX \`analytics_keyword_rankings_updated_at_idx\` ON \`analytics_keyword_rankings\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`analytics_keyword_rankings_created_at_idx\` ON \`analytics_keyword_rankings\` (\`created_at\`);`)

  // analytics_competitor_snapshots
  await db.run(sql`CREATE TABLE \`analytics_competitor_snapshots\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`snapshot_date\` text NOT NULL,
    \`domain\` text NOT NULL,
    \`estimated_traffic\` numeric,
    \`ranked_keywords_count\` numeric,
    \`overlap_with_us\` numeric,
    \`top_keywords\` text,
    \`gap_keywords\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)
  await db.run(sql`CREATE INDEX \`analytics_competitor_snapshots_snapshot_date_idx\` ON \`analytics_competitor_snapshots\` (\`snapshot_date\`);`)
  await db.run(sql`CREATE INDEX \`analytics_competitor_snapshots_domain_idx\` ON \`analytics_competitor_snapshots\` (\`domain\`);`)
  await db.run(sql`CREATE INDEX \`analytics_competitor_snapshots_updated_at_idx\` ON \`analytics_competitor_snapshots\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`analytics_competitor_snapshots_created_at_idx\` ON \`analytics_competitor_snapshots\` (\`created_at\`);`)

  // tracked_keywords
  await db.run(sql`CREATE TABLE \`tracked_keywords\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`keyword\` text NOT NULL,
    \`location\` text DEFAULT 'United States',
    \`search_engine\` text DEFAULT 'google',
    \`active\` integer DEFAULT true,
    \`notes\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)
  await db.run(sql`CREATE INDEX \`tracked_keywords_keyword_idx\` ON \`tracked_keywords\` (\`keyword\`);`)
  await db.run(sql`CREATE INDEX \`tracked_keywords_updated_at_idx\` ON \`tracked_keywords\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`tracked_keywords_created_at_idx\` ON \`tracked_keywords\` (\`created_at\`);`)

  // tracked_competitors
  await db.run(sql`CREATE TABLE \`tracked_competitors\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`domain\` text NOT NULL,
    \`label\` text,
    \`active\` integer DEFAULT true,
    \`notes\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)
  await db.run(sql`CREATE INDEX \`tracked_competitors_domain_idx\` ON \`tracked_competitors\` (\`domain\`);`)
  await db.run(sql`CREATE INDEX \`tracked_competitors_updated_at_idx\` ON \`tracked_competitors\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`tracked_competitors_created_at_idx\` ON \`tracked_competitors\` (\`created_at\`);`)

  // llm_target_prompts
  await db.run(sql`CREATE TABLE \`llm_target_prompts\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`prompt\` text NOT NULL,
    \`description\` text,
    \`active\` integer DEFAULT true,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)
  await db.run(sql`CREATE INDEX \`llm_target_prompts_prompt_idx\` ON \`llm_target_prompts\` (\`prompt\`);`)
  await db.run(sql`CREATE INDEX \`llm_target_prompts_updated_at_idx\` ON \`llm_target_prompts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`llm_target_prompts_created_at_idx\` ON \`llm_target_prompts\` (\`created_at\`);`)

  // llm_mention_snapshots
  await db.run(sql`CREATE TABLE \`llm_mention_snapshots\` (
    \`id\` integer PRIMARY KEY NOT NULL,
    \`snapshot_date\` text NOT NULL,
    \`prompt\` text NOT NULL,
    \`platform\` text NOT NULL,
    \`mentioned\` integer DEFAULT false,
    \`samples_total\` numeric DEFAULT 1,
    \`samples_mentioned\` numeric DEFAULT 0,
    \`domain_cited\` integer DEFAULT false,
    \`competitor_mentions\` text,
    \`response_snippet\` text,
    \`response_full\` text,
    \`cited_urls\` text,
    \`error_message\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)
  await db.run(sql`CREATE INDEX \`llm_mention_snapshots_snapshot_date_idx\` ON \`llm_mention_snapshots\` (\`snapshot_date\`);`)
  await db.run(sql`CREATE INDEX \`llm_mention_snapshots_prompt_idx\` ON \`llm_mention_snapshots\` (\`prompt\`);`)
  await db.run(sql`CREATE INDEX \`llm_mention_snapshots_platform_idx\` ON \`llm_mention_snapshots\` (\`platform\`);`)
  await db.run(sql`CREATE INDEX \`llm_mention_snapshots_updated_at_idx\` ON \`llm_mention_snapshots\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`llm_mention_snapshots_created_at_idx\` ON \`llm_mention_snapshots\` (\`created_at\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE IF EXISTS \`llm_mention_snapshots\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`llm_target_prompts\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`tracked_competitors\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`tracked_keywords\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`analytics_competitor_snapshots\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`analytics_keyword_rankings\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`analytics_gsc_snapshots\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`analytics_ga4_snapshots\`;`)
}
