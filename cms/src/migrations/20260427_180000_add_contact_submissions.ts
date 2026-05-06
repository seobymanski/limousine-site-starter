import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

/**
 * Create the contact_submissions table to back the ContactSubmissions
 * collection. Idempotent: catches "already exists" errors so re-runs are
 * safe.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  try {
    await db.run(sql`CREATE TABLE \`contact_submissions\` (
      \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      \`name\` text NOT NULL,
      \`email\` text NOT NULL,
      \`phone\` text,
      \`subject\` text DEFAULT 'General Inquiry',
      \`message\` text NOT NULL,
      \`handled\` integer DEFAULT 0 NOT NULL,
      \`internal_notes\` text,
      \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
      \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
    );`)
  } catch {
    // table already exists — fine
  }

  try {
    await db.run(sql`CREATE INDEX \`contact_submissions_email_idx\` ON \`contact_submissions\` (\`email\`);`)
  } catch {}
  try {
    await db.run(sql`CREATE INDEX \`contact_submissions_updated_at_idx\` ON \`contact_submissions\` (\`updated_at\`);`)
  } catch {}
  try {
    await db.run(sql`CREATE INDEX \`contact_submissions_created_at_idx\` ON \`contact_submissions\` (\`created_at\`);`)
  } catch {}
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE IF EXISTS \`contact_submissions\`;`)
}
