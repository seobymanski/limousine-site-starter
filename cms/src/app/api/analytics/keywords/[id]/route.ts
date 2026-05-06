/**
 * PATCH /api/analytics/keywords/:id  — toggle/update a single tracked-keyword row
 * DELETE /api/analytics/keywords/:id — delete a single tracked-keyword row
 *
 * Auth-gated to logged-in admin.
 */
import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { DEFAULT_LOCATION } from '@/lib/analytics-config'

async function authCheck() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  return { payload, user }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { payload, user } = await authCheck()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  let body: Record<string, any> = {}
  try {
    body = (await req.json()) as Record<string, any>
  } catch {}

  const allowed: Record<string, any> = {}
  if (typeof body.active === 'boolean') allowed.active = body.active
  if (typeof body.keyword === 'string' && body.keyword.trim()) allowed.keyword = body.keyword.trim()
  if (typeof body.location === 'string') allowed.location = body.location.trim() || DEFAULT_LOCATION
  if (typeof body.notes === 'string') allowed.notes = body.notes

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const updated = await payload.update({
    collection: 'tracked-keywords',
    id: Number(id),
    data: allowed as any,
  })
  return NextResponse.json({ ok: true, doc: updated })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { payload, user } = await authCheck()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  await payload.delete({ collection: 'tracked-keywords', id: Number(id) })
  return NextResponse.json({ ok: true })
}
