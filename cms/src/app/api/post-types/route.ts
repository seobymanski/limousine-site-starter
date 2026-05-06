/**
 * GET /api/post-types
 * Returns the list of blog post type presets configured in AI Settings.
 * Used by the "Generate with Claude" admin button to populate its dropdown.
 */

import { NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET() {
  try {
    const payload = await getPayload({ config })
    const settings = await payload.findGlobal({ slug: 'ai-settings' })
    const postTypes = Array.isArray(settings?.postTypes) ? settings.postTypes : []
    return NextResponse.json({
      postTypes: postTypes.map((p: any) => ({
        slug: p.slug,
        label: p.label,
        defaultCategory: p.defaultCategory,
      })),
    })
  } catch (err: any) {
    console.error('[/api/post-types] error', err)
    return NextResponse.json({ postTypes: [] }, { status: 200 })
  }
}
