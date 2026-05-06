import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`petition_signatures\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`post_slug\` text NOT NULL,
  	\`first_name\` text NOT NULL,
  	\`last_name\` text NOT NULL,
  	\`email\` text NOT NULL,
  	\`city\` text,
  	\`comment\` text,
  	\`display_public\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`petition_signatures_post_slug_idx\` ON \`petition_signatures\` (\`post_slug\`);`)
  await db.run(sql`CREATE INDEX \`petition_signatures_email_idx\` ON \`petition_signatures\` (\`email\`);`)
  await db.run(sql`CREATE INDEX \`petition_signatures_updated_at_idx\` ON \`petition_signatures\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`petition_signatures_created_at_idx\` ON \`petition_signatures\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`petition_signatures_id\` integer REFERENCES petition_signatures(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_petition_signatures_id_idx\` ON \`payload_locked_documents_rels\` (\`petition_signatures_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`petition_signatures\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`media_id\` integer,
  	\`blog_posts_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`blog_posts_id\`) REFERENCES \`blog_posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "users_id", "media_id", "blog_posts_id") SELECT "id", "order", "parent_id", "path", "users_id", "media_id", "blog_posts_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_blog_posts_id_idx\` ON \`payload_locked_documents_rels\` (\`blog_posts_id\`);`)
}
