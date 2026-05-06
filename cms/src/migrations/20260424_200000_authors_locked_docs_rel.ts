import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

/**
 * The previous migration that added the Authors collection forgot to extend
 * the payload_locked_documents_rels table with an authors_id column. Without
 * that column, Payload fails to lock any document for editing, which breaks
 * every edit page in the admin (blank screen).
 *
 * This migration is idempotent: if the column already exists, the ALTER will
 * fail and we catch it.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Idempotent: swallow any error from this ALTER (most commonly a "duplicate
  // column" when the column was added manually via wrangler d1 execute).
  try {
    await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`authors_id\` integer REFERENCES authors(id);`)
  } catch {
    // already exists — fine
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  try {
    await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` DROP COLUMN \`authors_id\`;`)
  } catch {
    // ignore
  }
}
