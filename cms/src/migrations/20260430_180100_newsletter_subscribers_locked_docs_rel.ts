import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

/**
 * Extend payload_locked_documents_rels with a newsletter_subscribers_id
 * column so Payload can lock documents in this collection for editing.
 * Without it, opening any subscriber in admin throws a blank screen.
 *
 * Idempotent — catches "duplicate column" if it already exists.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  try {
    await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`newsletter_subscribers_id\` integer REFERENCES newsletter_subscribers(id);`)
  } catch {
    // already exists — fine
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  try {
    await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`newsletter_subscribers_id\`;`)
  } catch {}
}
