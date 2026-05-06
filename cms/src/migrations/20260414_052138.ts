import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`ai_settings_post_types\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`slug\` text NOT NULL,
  	\`label\` text NOT NULL,
  	\`default_category\` text,
  	\`additional_instructions\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`ai_settings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`ai_settings_post_types_order_idx\` ON \`ai_settings_post_types\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`ai_settings_post_types_parent_id_idx\` ON \`ai_settings_post_types\` (\`_parent_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`ai_settings_post_types\`;`)
}
