import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`blog_posts_building_showcase_project_team\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`role\` text,
  	\`name\` text,
  	\`link\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`blog_posts\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`blog_posts_building_showcase_project_team_order_idx\` ON \`blog_posts_building_showcase_project_team\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_building_showcase_project_team_parent_id_idx\` ON \`blog_posts_building_showcase_project_team\` (\`_parent_id\`);`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`building_showcase_architect\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`building_showcase_year_built\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`building_showcase_style\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`building_showcase_address\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`building_showcase_city\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`building_showcase_status\` text;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` ADD \`building_showcase_tagline\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`blog_posts_building_showcase_project_team\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`building_showcase_architect\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`building_showcase_year_built\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`building_showcase_style\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`building_showcase_address\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`building_showcase_city\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`building_showcase_status\`;`)
  await db.run(sql`ALTER TABLE \`blog_posts\` DROP COLUMN \`building_showcase_tagline\`;`)
}
