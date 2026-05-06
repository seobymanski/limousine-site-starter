import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Authors collection (main table)
  await db.run(sql`CREATE TABLE \`authors\` (
    \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    \`name\` text NOT NULL,
    \`slug\` text NOT NULL,
    \`role\` text,
    \`company\` text,
    \`tagline\` text,
    \`photo_id\` integer REFERENCES media(id) ON DELETE SET NULL,
    \`about\` text,
    \`social_email\` text,
    \`social_twitter\` text,
    \`social_instagram\` text,
    \`social_linkedin\` text,
    \`social_website\` text,
    \`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
    \`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );`)

  await db.run(sql`CREATE UNIQUE INDEX \`authors_slug_idx\` ON \`authors\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`authors_photo_idx\` ON \`authors\` (\`photo_id\`);`)
  await db.run(sql`CREATE INDEX \`authors_updated_at_idx\` ON \`authors\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`authors_created_at_idx\` ON \`authors\` (\`created_at\`);`)

  // Authors expertise array table
  await db.run(sql`CREATE TABLE \`authors_expertise\` (
    \`_order\` integer NOT NULL,
    \`_parent_id\` integer NOT NULL,
    \`id\` text PRIMARY KEY NOT NULL,
    \`tag\` text NOT NULL,
    FOREIGN KEY (\`_parent_id\`) REFERENCES \`authors\`(\`id\`) ON UPDATE NO ACTION ON DELETE CASCADE
  );`)

  await db.run(sql`CREATE INDEX \`authors_expertise_order_idx\` ON \`authors_expertise\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`authors_expertise_parent_id_idx\` ON \`authors_expertise\` (\`_parent_id\`);`)

  // Add byline_id to blog_posts
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`byline_id\` integer REFERENCES authors(id) ON DELETE SET NULL;`)
  await db.run(sql`CREATE INDEX \`blog_posts_byline_idx\` ON \`blog_posts\` (\`byline_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX IF EXISTS \`blog_posts_byline_idx\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`byline_id\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`authors_expertise\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`authors\`;`)
}
