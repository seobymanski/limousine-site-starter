import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

/**
 * Migration: add the missing collection-relation columns and indexes to
 * payload_locked_documents_rels.
 *
 * Payload's runtime queries this table by joining on every registered
 * collection's <collection>_id column when checking document locks. Without
 * the column, any update (e.g. attaching a featuredImage) fails with a
 * "no such column" / failed query error.
 *
 * The auto-generated location-airport-sections migration originally
 * included these ADDs, but they were pruned at the time because I
 * incorrectly assumed they already existed in production. They didn't —
 * confirmed by PRAGMA table_info on 2026-05-04.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`analytics_ga4_snapshots_id\` integer REFERENCES analytics_ga4_snapshots(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`analytics_gsc_snapshots_id\` integer REFERENCES analytics_gsc_snapshots(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`analytics_keyword_rankings_id\` integer REFERENCES analytics_keyword_rankings(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`analytics_competitor_snapshots_id\` integer REFERENCES analytics_competitor_snapshots(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`tracked_keywords_id\` integer REFERENCES tracked_keywords(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`tracked_competitors_id\` integer REFERENCES tracked_competitors(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`llm_target_prompts_id\` integer REFERENCES llm_target_prompts(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`llm_mention_snapshots_id\` integer REFERENCES llm_mention_snapshots(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_analytics_ga4_snapshots_id_idx\` ON \`payload_locked_documents_rels\` (\`analytics_ga4_snapshots_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_analytics_gsc_snapshots_id_idx\` ON \`payload_locked_documents_rels\` (\`analytics_gsc_snapshots_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_analytics_keyword_rankings_idx\` ON \`payload_locked_documents_rels\` (\`analytics_keyword_rankings_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_analytics_competitor_snaps_idx\` ON \`payload_locked_documents_rels\` (\`analytics_competitor_snapshots_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_tracked_keywords_id_idx\` ON \`payload_locked_documents_rels\` (\`tracked_keywords_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_tracked_competitors_id_idx\` ON \`payload_locked_documents_rels\` (\`tracked_competitors_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_llm_target_prompts_id_idx\` ON \`payload_locked_documents_rels\` (\`llm_target_prompts_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_llm_mention_snapshots_id_idx\` ON \`payload_locked_documents_rels\` (\`llm_mention_snapshots_id\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`analytics_ga4_snapshots_id\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`analytics_gsc_snapshots_id\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`analytics_keyword_rankings_id\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`analytics_competitor_snapshots_id\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`tracked_keywords_id\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`tracked_competitors_id\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`llm_target_prompts_id\`;`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`llm_mention_snapshots_id\`;`)
}
