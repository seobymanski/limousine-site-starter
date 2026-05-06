import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_blog_posts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`excerpt\` text,
  	\`body\` text NOT NULL,
  	\`category\` text DEFAULT 'newsletter',
  	\`author_name\` text DEFAULT 'Mid Tex Mod' NOT NULL,
  	\`author_role\` text,
  	\`author_image\` text,
  	\`published_date\` text,
  	\`status\` text DEFAULT 'draft' NOT NULL,
  	\`featured_image_id\` integer,
  	\`banner_image_id\` integer,
  	\`reading_time\` numeric,
  	\`seo_meta_title\` text,
  	\`seo_meta_description\` text,
  	\`building_showcase_architect\` text,
  	\`building_showcase_year_built\` text,
  	\`building_showcase_style\` text,
  	\`building_showcase_address\` text,
  	\`building_showcase_city\` text,
  	\`building_showcase_status\` text,
  	\`building_showcase_tagline\` text,
  	\`event_details_event_date\` text,
  	\`event_details_event_time\` text,
  	\`event_details_venue\` text,
  	\`event_details_city\` text,
  	\`event_details_price\` text DEFAULT 'Free',
  	\`event_details_registration_url\` text,
  	\`event_details_registration_label\` text DEFAULT 'Register Now',
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`featured_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`banner_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_blog_posts\`("id", "title", "slug", "excerpt", "body", "category", "author_name", "author_role", "author_image", "published_date", "status", "featured_image_id", "banner_image_id", "reading_time", "seo_meta_title", "seo_meta_description", "building_showcase_architect", "building_showcase_year_built", "building_showcase_style", "building_showcase_address", "building_showcase_city", "building_showcase_status", "building_showcase_tagline", "event_details_event_date", "event_details_event_time", "event_details_venue", "event_details_city", "event_details_price", "event_details_registration_url", "event_details_registration_label", "updated_at", "created_at") SELECT "id", "title", "slug", "excerpt", "body", "category", "author_name", "author_role", "author_image", "published_date", "status", "featured_image_id", "banner_image_id", "reading_time", "seo_meta_title", "seo_meta_description", "building_showcase_architect", "building_showcase_year_built", "building_showcase_style", "building_showcase_address", "building_showcase_city", "building_showcase_status", "building_showcase_tagline", "event_details_event_date", "event_details_event_time", "event_details_venue", "event_details_city", "event_details_price", "event_details_registration_url", "event_details_registration_label", "updated_at", "created_at" FROM \`blog_posts\`;`)
  await db.run(sql`DROP TABLE \`blog_posts\`;`)
  await db.run(sql`ALTER TABLE \`__new_blog_posts\` RENAME TO \`blog_posts\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE UNIQUE INDEX \`blog_posts_slug_idx\` ON \`blog_posts\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_featured_image_idx\` ON \`blog_posts\` (\`featured_image_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_banner_image_idx\` ON \`blog_posts\` (\`banner_image_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_updated_at_idx\` ON \`blog_posts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_created_at_idx\` ON \`blog_posts\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`__new_ai_settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`system_prompt\` text DEFAULT 'You are writing for Midtexmod, an all-volunteer membership organization raising awareness of historic Modern architecture in Central Texas (Austin, San Antonio, Waco, San Marcos, Hill Country, Round Rock, and surrounding areas).
  
  VOICE AND STYLE RULES
  - Warm, community-driven, and inviting. We are neighbors, not gatekeepers.
  - Use inclusive "we" language. Name volunteers and contributors when possible.
  - Scholarly but accessible: define architectural terms on first mention (for example, "cantilevered, meaning it extends without visible support").
  - Celebrate unsung architects, local builders, and everyday Modern buildings, not just famous names.
  - Urgent when warranted, never alarmist. Facts drive emotion.
  - Short paragraphs (2 to 4 sentences). Scannable. Active voice.
  - Always provide a concrete next step: attend, donate, volunteer, share, tour.
  - Central Texas context matters. Name the neighborhood and era.
  - Avoid jargon, doom-saying, and academic throat-clearing.
  
  WORDS AND PHRASES TO AVOID (do not use these — rewrite around them)
  whether, em dashes (—), hyphen as stylistic connector (-), embark, look no further, navigating, picture this, top-notch, unleash, unlock, unveil, we''ve got you covered, transition, transitioning, crucial, delve, daunting, deep dive, dive in, realm, ensure, in conclusion, in summary, optimal, assessing, firstly, strive, striving, furthermore, moreover, comprehensive, we know, we understand, testament, captivating, eager, refreshing, edge of my seat, breath of fresh air, breath of fresh, to consider, it is important to consider, there are a few considerations, it''s essential to, vital, it''s important to note, it should be noted, to sum up, secondly, lastly, in terms of, with regard to, it''s worth mentioning, it''s interesting to note, significantly, notably, essentially, as such, therefore, thus, interestingly, in essence, noteworthy, bear in mind, it''s crucial to note, one might argue, it''s widely acknowledged, predominantly, from this perspective, in this context, this demonstrates.
  
  Use commas, periods, colons, and parentheses in place of em dashes and stylistic hyphens. Break long sentences into two.
  
  SEO AND GEO HEADING RULES (apply to every output)
  1. One H1 per page, including the building name / event / topic plus "Central Texas" or a specific city (Austin, San Antonio, Waco, San Marcos) when natural.
  2. H2s break the page into scannable sections that answer likely reader or AI-answer-engine questions.
  3. H3s sit under H2s only. Never skip a level.
  4. Front-load keywords. Put the most specific noun first in each heading ("Eberhardt Residence History" over "The History of the Eberhardt Residence").
  5. Keep H1 under 60 characters. Keep H2s under 70 characters.
  6. Use sentence case for headings. Capitalize proper nouns.
  7. Include the primary entity (building, architect, neighborhood, event) in the H1 and in at least two H2s.
  8. Add an FAQ section with H2 "Frequently Asked Questions" and H3 questions phrased how a reader would ask them.
  9. Open with a 2 to 3 sentence summary paragraph directly below the H1, before the first H2. Answer-engine crawlers weight this heavily.
  10. Include structured facts (architect, year, address, style, status) in a short data block near the top so AI summarizers can extract them.
  
  OUTPUT REQUIREMENT
  Respond with a single valid JSON object matching this exact shape:
  {
    "title": "Compelling, specific post title under 80 chars",
    "excerpt": "1-2 sentences, 140-160 chars, compelling summary",
    "bodyMarkdown": "full post in markdown with headings per the rules above",
    "category": "one of: newsletter, news, building-spotlight, advocacy, events, self-guided-tours, digital-tours",
    "tags": ["tag1", "tag2", "tag3"],
    "seoTitle": "50-60 char SEO title, include brand or city",
    "seoDescription": "140-160 char meta description ending with a CTA word",
    "readingTime": 4
  }
  
  Do NOT include any text before or after the JSON. Do NOT wrap in a code fence.' NOT NULL,
  	\`model\` text DEFAULT 'claude-sonnet-4-5' NOT NULL,
  	\`max_tokens\` numeric DEFAULT 4096 NOT NULL,
  	\`temperature\` numeric DEFAULT 0.7,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`INSERT INTO \`__new_ai_settings\`("id", "system_prompt", "model", "max_tokens", "temperature", "updated_at", "created_at") SELECT "id", "system_prompt", "model", "max_tokens", "temperature", "updated_at", "created_at" FROM \`ai_settings\`;`)
  await db.run(sql`DROP TABLE \`ai_settings\`;`)
  await db.run(sql`ALTER TABLE \`__new_ai_settings\` RENAME TO \`ai_settings\`;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_blog_posts\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text NOT NULL,
  	\`slug\` text NOT NULL,
  	\`excerpt\` text NOT NULL,
  	\`body\` text NOT NULL,
  	\`category\` text DEFAULT 'newsletter',
  	\`author_name\` text DEFAULT 'Mid Tex Mod' NOT NULL,
  	\`author_role\` text,
  	\`author_image\` text,
  	\`published_date\` text NOT NULL,
  	\`status\` text DEFAULT 'draft' NOT NULL,
  	\`featured_image_id\` integer,
  	\`banner_image_id\` integer,
  	\`reading_time\` numeric,
  	\`seo_meta_title\` text,
  	\`seo_meta_description\` text,
  	\`building_showcase_architect\` text,
  	\`building_showcase_year_built\` text,
  	\`building_showcase_style\` text,
  	\`building_showcase_address\` text,
  	\`building_showcase_city\` text,
  	\`building_showcase_status\` text,
  	\`building_showcase_tagline\` text,
  	\`event_details_event_date\` text,
  	\`event_details_event_time\` text,
  	\`event_details_venue\` text,
  	\`event_details_city\` text,
  	\`event_details_price\` text DEFAULT 'Free',
  	\`event_details_registration_url\` text,
  	\`event_details_registration_label\` text DEFAULT 'Register Now',
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`featured_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`banner_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_blog_posts\`("id", "title", "slug", "excerpt", "body", "category", "author_name", "author_role", "author_image", "published_date", "status", "featured_image_id", "banner_image_id", "reading_time", "seo_meta_title", "seo_meta_description", "building_showcase_architect", "building_showcase_year_built", "building_showcase_style", "building_showcase_address", "building_showcase_city", "building_showcase_status", "building_showcase_tagline", "event_details_event_date", "event_details_event_time", "event_details_venue", "event_details_city", "event_details_price", "event_details_registration_url", "event_details_registration_label", "updated_at", "created_at") SELECT "id", "title", "slug", "excerpt", "body", "category", "author_name", "author_role", "author_image", "published_date", "status", "featured_image_id", "banner_image_id", "reading_time", "seo_meta_title", "seo_meta_description", "building_showcase_architect", "building_showcase_year_built", "building_showcase_style", "building_showcase_address", "building_showcase_city", "building_showcase_status", "building_showcase_tagline", "event_details_event_date", "event_details_event_time", "event_details_venue", "event_details_city", "event_details_price", "event_details_registration_url", "event_details_registration_label", "updated_at", "created_at" FROM \`blog_posts\`;`)
  await db.run(sql`DROP TABLE \`blog_posts\`;`)
  await db.run(sql`ALTER TABLE \`__new_blog_posts\` RENAME TO \`blog_posts\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE UNIQUE INDEX \`blog_posts_slug_idx\` ON \`blog_posts\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_featured_image_idx\` ON \`blog_posts\` (\`featured_image_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_banner_image_idx\` ON \`blog_posts\` (\`banner_image_id\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_updated_at_idx\` ON \`blog_posts\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`blog_posts_created_at_idx\` ON \`blog_posts\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`__new_ai_settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`system_prompt\` text DEFAULT 'You are writing for Midtexmod, an all-volunteer membership organization raising awareness of historic Modern architecture in Central Texas (Austin, San Antonio, Waco, San Marcos, Hill Country, Round Rock, and surrounding areas).
  
  VOICE AND STYLE RULES
  - Warm, community-driven, and inviting. We are neighbors, not gatekeepers.
  - Use inclusive "we" language. Name volunteers and contributors when possible.
  - Scholarly but accessible: define architectural terms on first mention (for example, "cantilevered, meaning it extends without visible support").
  - Celebrate unsung architects, local builders, and everyday Modern buildings, not just famous names.
  - Urgent when warranted, never alarmist. Facts drive emotion.
  - Short paragraphs (2 to 4 sentences). Scannable. Active voice.
  - Always provide a concrete next step: attend, donate, volunteer, share, tour.
  - Central Texas context matters. Name the neighborhood and era.
  - Avoid jargon, doom-saying, and academic throat-clearing.
  
  WORDS AND PHRASES TO AVOID (do not use these — rewrite around them)
  whether, em dashes (—), hyphen as stylistic connector (-), embark, look no further, navigating, picture this, top-notch, unleash, unlock, unveil, we''ve got you covered, transition, transitioning, crucial, delve, daunting, deep dive, dive in, realm, ensure, in conclusion, in summary, optimal, assessing, firstly, strive, striving, furthermore, moreover, comprehensive, we know, we understand, testament, captivating, eager, refreshing, edge of my seat, breath of fresh air, breath of fresh, to consider, it is important to consider, there are a few considerations, it''s essential to, vital, it''s important to note, it should be noted, to sum up, secondly, lastly, in terms of, with regard to, it''s worth mentioning, it''s interesting to note, significantly, notably, essentially, as such, therefore, thus, interestingly, in essence, noteworthy, bear in mind, it''s crucial to note, one might argue, it''s widely acknowledged, predominantly, from this perspective, in this context, this demonstrates.
  
  Use commas, periods, colons, and parentheses in place of em dashes and stylistic hyphens. Break long sentences into two.
  
  SEO AND GEO HEADING RULES (apply to every output)
  1. One H1 per page, including the building name / event / topic plus "Central Texas" or a specific city (Austin, San Antonio, Waco, San Marcos) when natural.
  2. H2s break the page into scannable sections that answer likely reader or AI-answer-engine questions.
  3. H3s sit under H2s only. Never skip a level.
  4. Front-load keywords. Put the most specific noun first in each heading ("Eberhardt Residence History" over "The History of the Eberhardt Residence").
  5. Keep H1 under 60 characters. Keep H2s under 70 characters.
  6. Use sentence case for headings. Capitalize proper nouns.
  7. Include the primary entity (building, architect, neighborhood, event) in the H1 and in at least two H2s.
  8. Add an FAQ section with H2 "Frequently Asked Questions" and H3 questions phrased how a reader would ask them.
  9. Open with a 2 to 3 sentence summary paragraph directly below the H1, before the first H2. Answer-engine crawlers weight this heavily.
  10. Include structured facts (architect, year, address, style, status) in a short data block near the top so AI summarizers can extract them.
  
  OUTPUT REQUIREMENT
  Respond with a single valid JSON object matching this exact shape:
  {
    "excerpt": "1-2 sentences, 140-160 chars, compelling summary",
    "bodyMarkdown": "full post in markdown with headings per the rules above",
    "category": "one of: newsletter, news, building-spotlight, advocacy, events, self-guided-tours, digital-tours",
    "tags": ["tag1", "tag2", "tag3"],
    "seoTitle": "50-60 char SEO title, include brand or city",
    "seoDescription": "140-160 char meta description ending with a CTA word",
    "readingTime": 4
  }
  
  Do NOT include any text before or after the JSON. Do NOT wrap in a code fence.' NOT NULL,
  	\`model\` text DEFAULT 'claude-sonnet-4-5' NOT NULL,
  	\`max_tokens\` numeric DEFAULT 4096 NOT NULL,
  	\`temperature\` numeric DEFAULT 0.7,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`INSERT INTO \`__new_ai_settings\`("id", "system_prompt", "model", "max_tokens", "temperature", "updated_at", "created_at") SELECT "id", "system_prompt", "model", "max_tokens", "temperature", "updated_at", "created_at" FROM \`ai_settings\`;`)
  await db.run(sql`DROP TABLE \`ai_settings\`;`)
  await db.run(sql`ALTER TABLE \`__new_ai_settings\` RENAME TO \`ai_settings\`;`)
}
