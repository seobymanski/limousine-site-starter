import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

/**
 * Migration: add structured locationSections + airportSections to blog_posts,
 * drop the API-key columns from ai_settings.
 *
 * Hand-written rather than auto-generated because the .json snapshot history
 * is out of sync with production (intermediate hand-authored migrations
 * never updated the snapshot). The auto-generated file was creating tables
 * that already exist in production D1 — see git history for the discarded
 * version.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // ---- 1. New array-field subtables for the structured sections ----
  await db.run(sql`CREATE TABLE \`blog_posts_location_sections_top_services\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`heading\` text,
    \`body\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`blog_posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );`)
  await db.run(sql`CREATE INDEX \`blog_posts_location_sections_top_services_order_idx\` ON \`blog_posts_location_sections_top_services\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_location_sections_top_services_parent_id_idx\` ON \`blog_posts_location_sections_top_services\` (\`_parent_id\`);`)

  await db.run(sql`CREATE TABLE \`blog_posts_location_sections_faqs\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`question\` text,
    \`answer\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`blog_posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );`)
  await db.run(sql`CREATE INDEX \`blog_posts_location_sections_faqs_order_idx\` ON \`blog_posts_location_sections_faqs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_location_sections_faqs_parent_id_idx\` ON \`blog_posts_location_sections_faqs\` (\`_parent_id\`);`)

  await db.run(sql`CREATE TABLE \`blog_posts_airport_sections_top_services\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`heading\` text,
    \`body\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`blog_posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );`)
  await db.run(sql`CREATE INDEX \`blog_posts_airport_sections_top_services_order_idx\` ON \`blog_posts_airport_sections_top_services\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_airport_sections_top_services_parent_id_idx\` ON \`blog_posts_airport_sections_top_services\` (\`_parent_id\`);`)

  await db.run(sql`CREATE TABLE \`blog_posts_airport_sections_fbo_operators\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`name\` text,
    \`url\` text,
    \`terminal\` text,
    \`body\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`blog_posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );`)
  await db.run(sql`CREATE INDEX \`blog_posts_airport_sections_fbo_operators_order_idx\` ON \`blog_posts_airport_sections_fbo_operators\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_airport_sections_fbo_operators_parent_id_idx\` ON \`blog_posts_airport_sections_fbo_operators\` (\`_parent_id\`);`)

  await db.run(sql`CREATE TABLE \`blog_posts_airport_sections_drive_times\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`destination\` text,
    \`range\` text,
    \`url\` text,
    \`blurb\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`blog_posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );`)
  await db.run(sql`CREATE INDEX \`blog_posts_airport_sections_drive_times_order_idx\` ON \`blog_posts_airport_sections_drive_times\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_airport_sections_drive_times_parent_id_idx\` ON \`blog_posts_airport_sections_drive_times\` (\`_parent_id\`);`)

  await db.run(sql`CREATE TABLE \`blog_posts_airport_sections_faqs\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`question\` text,
    \`answer\` text,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`blog_posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );`)
  await db.run(sql`CREATE INDEX \`blog_posts_airport_sections_faqs_order_idx\` ON \`blog_posts_airport_sections_faqs\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_airport_sections_faqs_parent_id_idx\` ON \`blog_posts_airport_sections_faqs\` (\`_parent_id\`);`)

  // ---- 2. Add scalar columns for the section group fields to blog_posts ----
  // locationSections
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`location_sections_opening\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`location_sections_benefits_heading\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`location_sections_benefits_body\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`location_sections_about\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`location_sections_cta_heading\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`location_sections_what_we_offer\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`location_sections_why_choose_us\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`location_sections_pricing\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`location_sections_events\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`location_sections_neighborhoods\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`location_sections_venues\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`location_sections_closing_cta_heading\` text;`)
  // airportSections
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`airport_sections_opening\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`airport_sections_benefits_heading\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`airport_sections_benefits_body\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`airport_sections_about\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`airport_sections_cta_heading\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`airport_sections_what_we_offer\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`airport_sections_why_choose_us\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`airport_sections_airport_quick_facts_runway_count\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`airport_sections_airport_quick_facts_longest_runway\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`airport_sections_airport_quick_facts_elevation\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`airport_sections_airport_quick_facts_hours\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`airport_sections_airport_quick_facts_customs_available\` integer;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`airport_sections_airport_quick_facts_slot_p_p_r\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`airport_sections_airport_quick_facts_body\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`airport_sections_airport_quick_facts_source_url\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`airport_sections_local_considerations\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`airport_sections_closing_cta_heading\` text;`)

  // ---- 3. Drop the anthropic_api_key column from ai_settings ----
  // SQLite 3.35+ supports DROP COLUMN. D1's SQLite is current.
  // Note: perplexity_api_key was never actually added to the production DB
  // (it was added/removed from the schema in the same release without a
  // migration), so there's nothing to drop for that one.
  await db.run(sql`ALTER TABLE \`ai_settings\` DROP COLUMN \`anthropic_api_key\`;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Drop the 6 new subtables
  await db.run(sql`DROP TABLE IF EXISTS \`blog_posts_location_sections_top_services\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`blog_posts_location_sections_faqs\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`blog_posts_airport_sections_top_services\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`blog_posts_airport_sections_fbo_operators\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`blog_posts_airport_sections_drive_times\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`blog_posts_airport_sections_faqs\`;`)

  // Drop the scalar section columns from blog_posts
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`location_sections_opening\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`location_sections_benefits_heading\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`location_sections_benefits_body\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`location_sections_about\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`location_sections_cta_heading\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`location_sections_what_we_offer\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`location_sections_why_choose_us\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`location_sections_pricing\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`location_sections_events\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`location_sections_neighborhoods\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`location_sections_venues\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`location_sections_closing_cta_heading\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`airport_sections_opening\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`airport_sections_benefits_heading\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`airport_sections_benefits_body\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`airport_sections_about\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`airport_sections_cta_heading\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`airport_sections_what_we_offer\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`airport_sections_why_choose_us\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`airport_sections_airport_quick_facts_runway_count\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`airport_sections_airport_quick_facts_longest_runway\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`airport_sections_airport_quick_facts_elevation\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`airport_sections_airport_quick_facts_hours\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`airport_sections_airport_quick_facts_customs_available\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`airport_sections_airport_quick_facts_slot_p_p_r\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`airport_sections_airport_quick_facts_body\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`airport_sections_airport_quick_facts_source_url\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`airport_sections_local_considerations\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`airport_sections_closing_cta_heading\`;`)

  // Re-add the anthropic_api_key column to ai_settings
  await db.run(sql`ALTER TABLE \`ai_settings\` ADD COLUMN \`anthropic_api_key\` text;`)
}
