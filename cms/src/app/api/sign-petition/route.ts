/**
 * POST /api/sign-petition
 *
 * Body: { postSlug, firstName, lastName, email, city?, comment?, displayPublic? }
 *
 * Stores a signature for a demolition-alert petition. CORS-open so the
 * public Astro site can POST directly.
 */
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

const ALLOWED_ORIGINS = [
  'https://example.com',
  'https://www.example.com',
  'https://CLIENT-site.workers.dev',
  'http://localhost:4321',
]

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Vary': 'Origin',
  }
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  const headers = corsHeaders(origin)

  try {
    const body = (await req.json()) as Record<string, unknown>

    const postSlug = typeof body.postSlug === 'string' ? body.postSlug.trim() : ''
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const city = typeof body.city === 'string' ? body.city.trim() : undefined
    const comment = typeof body.comment === 'string' ? body.comment.trim() : undefined
    const displayPublic = body.displayPublic !== false

    if (!postSlug || !firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, email, and post slug are required.' },
        { status: 400, headers },
      )
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400, headers })
    }

    const payload = await getPayload({ config })

    const existing = await payload.find({
      collection: 'petition-signatures',
      where: {
        and: [{ email: { equals: email } }, { postSlug: { equals: postSlug } }],
      },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      return NextResponse.json(
        { ok: true, duplicate: true, message: 'You have already signed this petition.' },
        { status: 200, headers },
      )
    }

    await payload.create({
      collection: 'petition-signatures',
      data: {
        postSlug,
        firstName,
        lastName,
        email,
        city,
        comment,
        displayPublic,
      },
    })

    return NextResponse.json({ ok: true }, { status: 201, headers })
  } catch (err: any) {
    console.error('[/api/sign-petition] error', err)
    return NextResponse.json(
      { error: err?.message ?? 'Could not record signature.' },
      { status: 500, headers },
    )
  }
}
