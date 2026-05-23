/**
 * Custom dashboard card grid that shows the description for each collection
 * inline. Replaces the default Payload dashboard tiles (which only show the
 * collection name and a Create button); the defaults are hidden via CSS in
 * AdminListStyles.
 *
 * Card descriptions are kept in sync with each collection's admin.description
 * by hand here. If you change one in the collection file, mirror it here.
 *
 * Per-client: edit SECTIONS to match your collection lineup. Analytics
 * collections are intentionally omitted — they're auto-populated by the
 * cron and surfaced through /admin/analytics/overview instead.
 */
import React from 'react'
import Link from 'next/link'
import { brand } from '../lib/brand'

interface CardSpec {
  label: string
  href: string
  createHref?: string
  description: string
}

interface SectionSpec {
  title: string
  cards: CardSpec[]
}

const SECTIONS: SectionSpec[] = [
  {
    title: 'Content',
    cards: [
      {
        label: 'Website Content',
        href: '/admin/collections/blog-posts',
        createHref: '/admin/collections/blog-posts/create',
        description:
          'Location pages, airport/FBO pages, blog posts, and news — every piece of long-form content on the public site, including the structured section fields used by the AI generator.',
      },
      {
        label: 'Authors',
        href: '/admin/collections/authors',
        createHref: '/admin/collections/authors/create',
        description:
          'Contributors and authors. Each gets a public profile at /author/<slug>, and an Author must exist here before they can be assigned as the byline on a post.',
      },
      {
        label: 'Media',
        href: '/admin/collections/media',
        createHref: '/admin/collections/media/create',
        description:
          'Reusable image library. Upload once, then attach to posts, author profiles, hero banners, or galleries. Files are stored on Cloudflare R2 and served from the CDN.',
      },
    ],
  },
  {
    title: 'Analytics',
    cards: [
      {
        label: 'Tracked Keywords',
        href: '/admin/collections/tracked-keywords',
        createHref: '/admin/collections/tracked-keywords/create',
        description:
          'Keywords you want to rank for. Each is checked weekly via the DataForSEO cron, and the position history powers the Analytics → Keywords dashboard.',
      },
      {
        label: 'Tracked Competitors',
        href: '/admin/collections/tracked-competitors',
        createHref: '/admin/collections/tracked-competitors/create',
        description:
          'Competitor domains the SEO crons compare you against. Powers the gap analysis and competitor traffic snapshots on the analytics dashboard.',
      },
      {
        label: 'LLM Prompts',
        href: '/admin/collections/llm-target-prompts',
        createHref: '/admin/collections/llm-target-prompts/create',
        description:
          'Questions where the brand should be mentioned. Sent to every configured LLM weekly; responses are scored on whether they cite your site or brand by name.',
      },
    ],
  },
  {
    title: 'Community',
    cards: [
      {
        label: 'Contact Submissions',
        href: '/admin/collections/contact-submissions',
        description:
          'Messages sent through the public contact form, archived here in addition to being emailed. Mark each as handled when you have replied so the unactioned ones stay easy to spot.',
      },
      {
        label: 'Newsletter Subscribers',
        href: '/admin/collections/newsletter-subscribers',
        description:
          'Emails captured from the public newsletter signup form. Each new newsletter post is automatically emailed to everyone here who has not unsubscribed.',
      },
      {
        label: 'Petition Signatures',
        href: '/admin/collections/petition-signatures',
        description:
          'Signatures collected against demolition-alert posts. Each row links to the slug of the post it supports, and signers can opt into having their name shown on the public page.',
      },
    ],
  },
  {
    title: 'Settings',
    cards: [
      {
        label: 'Users',
        href: '/admin/collections/users',
        createHref: '/admin/collections/users/create',
        description:
          'Editors with access to this admin. Add a teammate when they need to publish, moderate, or manage site content.',
      },
      {
        label: 'AI Settings',
        href: '/admin/globals/ai-settings',
        description:
          'Control how Claude drafts content. Edit the system prompt, post-type presets, and model selection to shape voice, structure, and SEO quality across every post type.',
      },
    ],
  },
]

const STYLES = `
.lm-dash {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}
.lm-dash-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lm-dash-section h2 {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: ${brand.sectionLabelFg};
  font-family: system-ui, -apple-system, sans-serif;
}
.lm-dash-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}
.lm-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: ${brand.cardBodyBg};
  border: 1px solid ${brand.cardBorder};
  border-radius: 6px;
  overflow: hidden;
  transition: box-shadow 160ms ease, transform 160ms ease, border-color 160ms ease;
}
.lm-card:hover {
  box-shadow: 0 8px 22px -10px ${brand.cardHoverShadow};
  border-color: ${brand.cardHoverBorder};
  transform: translateY(-1px);
}
.lm-card-stretched {
  position: absolute;
  inset: 0;
  z-index: 1;
  text-indent: -9999px;
  overflow: hidden;
}
.lm-card-head {
  display: flex;
  align-items: stretch;
  background: ${brand.cardHeaderBg};
}
.lm-card-label {
  flex: 1;
  padding: 6px 12px 7px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${brand.cardHeaderFg};
  font-family: system-ui, -apple-system, sans-serif;
  display: flex;
  align-items: center;
}
.lm-card-create {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  color: ${brand.cardHeaderFg};
  text-decoration: none;
  font-size: 18px;
  font-weight: 600;
  line-height: 1;
  flex-shrink: 0;
  border-left: 1px solid rgba(15, 15, 15, 0.18);
  transition: background 140ms ease;
}
.lm-card-create:hover { background: rgba(15, 15, 15, 0.1); }
.lm-card-desc {
  margin: 0;
  padding: 6px 11px 8px;
  font-size: 10.5px;
  line-height: 1.35;
  color: ${brand.cardBodyFg};
  font-family: system-ui, -apple-system, sans-serif;
}
`

const DashboardCards: React.FC = () => {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="lm-dash">
        {SECTIONS.map((section) => (
          <div key={section.title} className="lm-dash-section">
            <h2>{section.title}</h2>
            <div className="lm-dash-cards">
              {section.cards.map((card) => (
                <div key={card.label} className="lm-card">
                  <Link href={card.href} className="lm-card-stretched" aria-label={card.label}>
                    {card.label}
                  </Link>
                  <div className="lm-card-head">
                    <span className="lm-card-label">{card.label}</span>
                    {card.createHref && (
                      <Link
                        href={card.createHref}
                        className="lm-card-create"
                        aria-label={`Create new ${card.label}`}
                      >
                        +
                      </Link>
                    )}
                  </div>
                  <p className="lm-card-desc">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default DashboardCards
