/**
 * POST /api/seed-ai-settings
 *
 * Admin-only endpoint that resets the AI Settings global to the latest
 * defaults baked into the code (DEFAULT_SYSTEM_PROMPT and DEFAULT_POST_TYPES).
 *
 * Use this whenever you update the defaults in the repo and want to push the
 * new values to the running CMS without manual copy-paste.
 */

import { NextResponse } from 'next/server'
import { getPayload, type PayloadRequest } from 'payload'
import config from '@payload-config'
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_POST_TYPES } from '../../../globals/AISettings'
import { headers as nextHeaders } from 'next/headers'

export async function POST() {
  try {
    const payload = await getPayload({ config })

    // Require admin auth — reuse Payload's session cookie
    const hdrs = await nextHeaders()
    const { user } = await payload.auth({ headers: hdrs as any } as { headers: PayloadRequest['headers'] } as any)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized — log into the admin first.' }, { status: 401 })
    }

    const updated = await payload.updateGlobal({
      slug: 'ai-settings',
      data: {
        systemPrompt: DEFAULT_SYSTEM_PROMPT(),
        postTypes: DEFAULT_POST_TYPES() as any,
      },
    })

    return NextResponse.json({
      ok: true,
      message: 'AI Settings reset to latest defaults.',
      postTypesCount: Array.isArray(updated?.postTypes) ? updated.postTypes.length : 0,
      systemPromptLength: updated?.systemPrompt?.length ?? 0,
    })
  } catch (err: any) {
    console.error('[/api/seed-ai-settings] error', err)
    return NextResponse.json({ error: err?.message ?? 'Failed to seed AI settings' }, { status: 500 })
  }
}
