import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

/**
 * Add an `advocacy` column to the authors table. Holds rich-text content
 * about what this author advocates for.
 *
 * Idempotent: catches "duplicate column" errors so this can re-run safely.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Idempotent: swallow any error (typically duplicate column when added via SQL earlier).
  try {
    await db.run(sql`ALTER TABLE \`authors\` ADD \`advocacy\` text;`)
  } catch {
    // already exists — fine
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  try {
    await db.run(sql`ALTER TABLE \`authors\` DROP COLUMN \`advocacy\`;`)
  } catch {
    // ignore
  }
}
