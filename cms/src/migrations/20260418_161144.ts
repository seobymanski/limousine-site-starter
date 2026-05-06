import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`event_details_event_date\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`event_details_event_time\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`event_details_venue\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`event_details_city\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`event_details_price\` text DEFAULT 'Free';`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`event_details_registration_url\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`event_details_registration_label\` text DEFAULT 'Register Now';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`event_details_event_date\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`event_details_event_time\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`event_details_venue\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`event_details_city\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`event_details_price\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`event_details_registration_url\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`event_details_registration_label\`;`)
}
