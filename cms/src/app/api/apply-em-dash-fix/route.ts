/**
 * POST /api/apply-em-dash-fix
 *
 * Admin-only one-shot endpoint that replaces the live systemPrompt with the
 * bundled DEFAULT_SYSTEM_PROMPT (em-dash-free, with strengthened punctuation
 * rule + emphasized words section), and strips em dashes from each post-type
 * additionalInstructions in place. Idempotent.
 */

import { NextResponse } from "next/server"
import { getPayload, type PayloadRequest } from "payload"
import config from "@payload-config"
import { headers as nextHeaders } from "next/headers"
import { DEFAULT_SYSTEM_PROMPT } from "@/globals/AISettings"

const stripEmDashes = (s: string): string => s.replace(/ — /g, ", ").replace(/—/g, ", ")

export async function POST() {
  try {
    const payload = await getPayload({ config })

    const hdrs = await nextHeaders()
    const { user } = await payload.auth({ headers: hdrs as any } as { headers: PayloadRequest["headers"] } as any)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized — log into the admin first." }, { status: 401 })
    }

    const settings = await payload.findGlobal({ slug: "ai-settings" })
    const existing = Array.isArray(settings?.postTypes) ? (settings.postTypes as any[]) : []

    const updates: Array<{ slug: string; emDashesRemoved: number }> = []

    const nextPostTypes = existing.map((pt) => {
      if (!pt) return pt
      const before = pt.additionalInstructions ?? ""
      const removed = (before.match(/—/g) || []).length
      const cleaned = stripEmDashes(before)
      updates.push({ slug: pt.slug ?? "(unknown)", emDashesRemoved: removed })
      return { ...pt, additionalInstructions: cleaned }
    })

    const sysBefore = settings?.systemPrompt ?? ""
    const sysEmDashes = (sysBefore.match(/—/g) || []).length
    const newSysPrompt = DEFAULT_SYSTEM_PROMPT()

    await payload.updateGlobal({
      slug: "ai-settings",
      data: {
        systemPrompt: newSysPrompt,
        postTypes: nextPostTypes as any,
      },
    })

    return NextResponse.json({
      ok: true,
      systemPrompt: {
        replaced: true,
        previousLength: sysBefore.length,
        previousEmDashes: sysEmDashes,
        newLength: newSysPrompt.length,
        newEmDashes: (newSysPrompt.match(/—/g) || []).length,
      },
      postTypes: updates,
    })
  } catch (err: any) {
    console.error("[/api/apply-em-dash-fix] error", err)
    return NextResponse.json({ error: err?.message ?? "Failed to apply fix" }, { status: 500 })
  }
}

