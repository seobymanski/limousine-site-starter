import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

/**
 * Create the newsletter_subscribers table that backs the
 * NewsletterSubscribers collection. Idempotent: catches "already exists"
 * errors so re-runs are safe.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  try {
    await db.run(sql`CREATE TABLE \`newsletter_subscribers\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`email\` text NOT NULL,
      \`source\` text,
      \`confirmed\` integer DEFAULT 1 NOT NULL,
      \`unsubscribed\` integer DEFAULT 0 NOT NULL,
      \`unsubscribed_at\` text,
      \`unsubscribe_token\` text NOT NULL,
      \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
      \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
    );`)
  } catch {
    // table already exists — fine
  }

  try {
    await db.run(sql`CREATE UNIQUE INDEX \`newsletter_subscribers_email_idx\` ON \`newsletter_subscribers\` (\`email\`);`)
  } catch {}
  try {
    await db.run(sql`CREATE INDEX \`newsletter_subscribers_unsubscribed_idx\` ON \`newsletter_subscribers\` (\`unsubscribed\`);`)
  } catch {}
  try {
    await db.run(sql`CREATE INDEX \`newsletter_subscribers_unsubscribe_token_idx\` ON \`newsletter_subscribers\` (\`unsubscribe_token\`);`)
  } catch {}
  try {
    await db.run(sql`CREATE INDEX \`newsletter_subscribers_updated_at_idx\` ON \`newsletter_subscribers\` (\`updated_at\`);`)
  } catch {}
  try {
    await db.run(sql`CREATE INDEX \`newsletter_subscribers_created_at_idx\` ON \`newsletter_subscribers\` (\`created_at\`);`)
  } catch {}
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE IF EXISTS \`newsletter_subscribers\`;`)
}
