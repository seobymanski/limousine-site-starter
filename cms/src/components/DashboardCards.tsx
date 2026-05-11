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

const DashboardCards: React.FC = () => {
  return (
    <div style={{ marginBottom: 8 }}>
      {SECTIONS.map((section) => (
        <div key={section.title} style={{ marginBottom: 12 }}>
          <h2
            style={{
              margin: '0 0 6px',
              fontSize: 11,
              fontWeight: 800,
              color: '#b08400',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {section.title}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 6,
            }}
          >
            {section.cards.map((card) => (
              <div
                key={card.label}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#fafaf5',
                  border: '1px solid #e8e8e2',
                  borderRadius: 8,
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '7px 11px 3px',
                  }}
                >
                  <Link
                    href={card.href}
                    style={{
                      flex: 1,
                      fontSize: 11,
                      fontWeight: 800,
                      color: '#0f0f0f',
                      textTransform: 'uppercase',
                      letterSpacing: '0.10em',
                      textDecoration: 'none',
                      fontFamily: 'system-ui, sans-serif',
                    }}
                  >
                    {card.label}
                  </Link>
                  {card.createHref && (
                    <Link
                      href={card.createHref}
                      title={`Create new ${card.label}`}
                      aria-label={`Create new ${card.label}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 20,
                        height: 20,
                        color: '#0f0f0f',
                        textDecoration: 'none',
                        fontSize: 14,
                        fontWeight: 700,
                        lineHeight: 1,
                        flexShrink: 0,
                        borderRadius: '50%',
                        border: '1px solid #FFC700',
                        background: '#FFC700',
                        marginLeft: 6,
                      }}
                    >
                      +
                    </Link>
                  )}
                </div>
                <p
                  style={{
                    margin: 0,
                    padding: '0 11px 9px',
                    fontSize: 11,
                    lineHeight: 1.4,
                    color: '#636360',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default DashboardCards
