import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

/**
 * Add status (draft/published) to authors so the admin can show the same
 * Live/Draft toggle that Website Content posts have. Existing authors are
 * marked published so their /author/<slug> pages stay live.
 *
 * Idempotent: swallow errors (e.g. duplicate column when already applied via SQL).
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  try {
    await db.run(sql`ALTER TABLE \`authors\` ADD \`status\` text DEFAULT 'draft' NOT NULL;`)
  } catch {
    // already exists
  }
  try {
    await db.run(sql`UPDATE \`authors\` SET \`status\` = 'published' WHERE \`status\` IS NULL OR \`status\` = 'draft';`)
  } catch {
    // ignore
  }
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  try {
    await db.run(sql`ALTER TABLE \`authors\` DROP COLUMN \`status\`;`)
  } catch {
    // ignore
  }
}
