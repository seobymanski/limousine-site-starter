import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

/**
 * Extend payload_locked_documents_rels with a contact_submissions_id column
 * so Payload can lock documents in this collection for editing. Without it,
 * opening any contact submission in admin throws a blank screen.
 *
 * Idempotent — catches "duplicate column" if it already exists.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  try {
    await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`contact_submissions_id\` integer REFERENCES contact_submissions(id);`)
  } catch {
    // already exists — fine
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  try {
    await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`contact_submissions_id\`;`)
  } catch {}
}
