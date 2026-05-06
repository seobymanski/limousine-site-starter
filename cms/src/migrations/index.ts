import * as migration_20250929_111647 from './20250929_111647';
import * as migration_20260414_002713 from './20260414_002713';
import * as migration_20260414_051015 from './20260414_051015';
import * as migration_20260414_052138 from './20260414_052138';
import * as migration_20260415_210022 from './20260415_210022';
import * as migration_20260415_221143 from './20260415_221143';
import * as migration_20260416_151211 from './20260416_151211';
import * as migration_20260418_161144 from './20260418_161144';
import * as migration_20260420_042419 from './20260420_042419';
import * as migration_20260420_173820 from './20260420_173820';
import * as migration_20260421_163402_add_user_avatar from './20260421_163402_add_user_avatar';
import * as migration_20260421_213725_add_use_live_research from './20260421_213725_add_use_live_research';
import * as migration_20260424_190000_add_authors from './20260424_190000_add_authors';
import * as migration_20260424_200000_authors_locked_docs_rel from './20260424_200000_authors_locked_docs_rel';
import * as migration_20260424_210000_add_advocacy_to_authors from './20260424_210000_add_advocacy_to_authors';
import * as migration_20260424_220000_add_status_to_authors from './20260424_220000_add_status_to_authors';
import * as migration_20260427_180000_add_contact_submissions from './20260427_180000_add_contact_submissions';
import * as migration_20260427_180100_contact_submissions_locked_docs_rel from './20260427_180100_contact_submissions_locked_docs_rel';
import * as migration_20260430_180000_add_newsletter_subscribers from './20260430_180000_add_newsletter_subscribers';
import * as migration_20260430_180100_newsletter_subscribers_locked_docs_rel from './20260430_180100_newsletter_subscribers_locked_docs_rel';
import * as migration_20260504_195524_add_location_airport_sections from './20260504_195524_add_location_airport_sections';
import * as migration_20260504_220000_add_locked_documents_rels_columns from './20260504_220000_add_locked_documents_rels_columns';
import * as migration_20260505_040817_add_missing_analytics_tables from './20260505_040817_add_missing_analytics_tables';

export const migrations = [
  {
    up: migration_20250929_111647.up,
    down: migration_20250929_111647.down,
    name: '20250929_111647',
  },
  {
    up: migration_20260414_002713.up,
    down: migration_20260414_002713.down,
    name: '20260414_002713',
  },
  {
    up: migration_20260414_051015.up,
    down: migration_20260414_051015.down,
    name: '20260414_051015',
  },
  {
    up: migration_20260414_052138.up,
    down: migration_20260414_052138.down,
    name: '20260414_052138',
  },
  {
    up: migration_20260415_210022.up,
    down: migration_20260415_210022.down,
    name: '20260415_210022',
  },
  {
    up: migration_20260415_221143.up,
    down: migration_20260415_221143.down,
    name: '20260415_221143',
  },
  {
    up: migration_20260416_151211.up,
    down: migration_20260416_151211.down,
    name: '20260416_151211',
  },
  {
    up: migration_20260418_161144.up,
    down: migration_20260418_161144.down,
    name: '20260418_161144',
  },
  {
    up: migration_20260420_042419.up,
    down: migration_20260420_042419.down,
    name: '20260420_042419',
  },
  {
    up: migration_20260420_173820.up,
    down: migration_20260420_173820.down,
    name: '20260420_173820',
  },
  {
    up: migration_20260421_163402_add_user_avatar.up,
    down: migration_20260421_163402_add_user_avatar.down,
    name: '20260421_163402_add_user_avatar',
  },
  {
    up: migration_20260421_213725_add_use_live_research.up,
    down: migration_20260421_213725_add_use_live_research.down,
    name: '20260421_213725_add_use_live_research',
  },
  {
    up: migration_20260424_190000_add_authors.up,
    down: migration_20260424_190000_add_authors.down,
    name: '20260424_190000_add_authors',
  },
  {
    up: migration_20260424_200000_authors_locked_docs_rel.up,
    down: migration_20260424_200000_authors_locked_docs_rel.down,
    name: '20260424_200000_authors_locked_docs_rel',
  },
  {
    up: migration_20260424_210000_add_advocacy_to_authors.up,
    down: migration_20260424_210000_add_advocacy_to_authors.down,
    name: '20260424_210000_add_advocacy_to_authors',
  },
  {
    up: migration_20260424_220000_add_status_to_authors.up,
    down: migration_20260424_220000_add_status_to_authors.down,
    name: '20260424_220000_add_status_to_authors',
  },
  {
    up: migration_20260427_180000_add_contact_submissions.up,
    down: migration_20260427_180000_add_contact_submissions.down,
    name: '20260427_180000_add_contact_submissions',
  },
  {
    up: migration_20260427_180100_contact_submissions_locked_docs_rel.up,
    down: migration_20260427_180100_contact_submissions_locked_docs_rel.down,
    name: '20260427_180100_contact_submissions_locked_docs_rel',
  },
  {
    up: migration_20260430_180000_add_newsletter_subscribers.up,
    down: migration_20260430_180000_add_newsletter_subscribers.down,
    name: '20260430_180000_add_newsletter_subscribers',
  },
  {
    up: migration_20260430_180100_newsletter_subscribers_locked_docs_rel.up,
    down: migration_20260430_180100_newsletter_subscribers_locked_docs_rel.down,
    name: '20260430_180100_newsletter_subscribers_locked_docs_rel',
  },
  {
    up: migration_20260504_195524_add_location_airport_sections.up,
    down: migration_20260504_195524_add_location_airport_sections.down,
    name: '20260504_195524_add_location_airport_sections',
  },
  {
    up: migration_20260504_220000_add_locked_documents_rels_columns.up,
    down: migration_20260504_220000_add_locked_documents_rels_columns.down,
    name: '20260504_220000_add_locked_documents_rels_columns',
  },
  {
    up: migration_20260505_040817_add_missing_analytics_tables.up,
    down: migration_20260505_040817_add_missing_analytics_tables.down,
    name: '20260505_040817_add_missing_analytics_tables'
  },
];
