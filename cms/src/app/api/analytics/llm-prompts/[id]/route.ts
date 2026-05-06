/**
 * PATCH /api/analytics/llm-prompts/:id  — toggle/update a prompt
 * DELETE /api/analytics/llm-prompts/:id — delete a prompt
 *
 * Auth-gated to logged-in admin.
 */
import { NextResponse } from 'next/server'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

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
  if (typeof body.prompt === 'string' && body.prompt.trim()) allowed.prompt = body.prompt.trim()
  if (typeof body.description === 'string') allowed.description = body.description.trim() || null

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 })
  }

  const updated = await payload.update({
    collection: 'llm-target-prompts',
    id: Number(id),
    data: allowed as any,
  })
  return NextResponse.json({ ok: true, doc: updated })
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { payload, user } = await authCheck()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  await payload.delete({ collection: 'llm-target-prompts', id: Number(id) })
  return NextResponse.json({ ok: true })
}
