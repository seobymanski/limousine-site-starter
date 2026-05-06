/**
 * Shared logic for the weekly DataForSEO snapshot. Called by both the cron
 * route and the manual trigger so the two surfaces never drift.
 *
 * One run does:
 *   1. Pull our domain's full ranked-keyword profile (one API call).
 *   2. Persist that profile as a snapshot row under our own domain in
 *      analytics-competitor-snapshots (so the Overview dashboard can show
 *      "where we currently rank" without re-querying DataForSEO).
 *   3. For each active tracked-keyword, write a row with our position
 *      (or null if we're not in the top 1000 ranked keywords).
 *   4. For each active tracked-competitor, pull their ranked-keyword
 *      profile (one API call each) and write a snapshot with overlap +
 *      gap keywords against our profile.
 *
 * Idempotent: snapshots for the same date are upserted, not duplicated.
 */

import type { Payload } from 'payload'
import {
  fetchDomainProfile,
  computeGapKeywords,
  computeOverlapCount,
  findKeywordRanking,
  type DomainProfile,
} from './dataforseo'
import { OUR_DOMAIN } from './analytics-config'

function normalizeDomain(input: string): string {
  let d = (input ?? '').trim().toLowerCase()
  d = d.replace(/^https?:\/\//, '')
  d = d.replace(/^www\./, '')
  d = d.split('/')[0]
  d = d.split('?')[0]
  return d
}

interface RunResult {
  ourProfile: {
    ok: boolean
    rankedKeywordsCount?: number
    estimatedTraffic?: number
    error?: string
  }
  keywordRankings: { ok: boolean; written?: number; error?: string }
  competitors: Array<{ domain: string; ok: boolean; error?: string }>
  date: string
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * D1 stores Payload date fields as plain YYYY-MM-DD strings; the `like`
 * operator works against the raw stored string so we use it to look up
 * existing rows by date prefix (same pattern as analytics-runner).
 */
async function upsertByDateAndDomain(
  payload: Payload,
  collection: 'analytics-competitor-snapshots',
  date: string,
  domain: string,
  data: Record<string, any>,
) {
  const existing = await payload.find({
    collection,
    where: {
      and: [
        { snapshotDate: { like: date } } as any,
        { domain: { equals: domain } },
      ],
    } as any,
    limit: 1,
  })
  if (existing.docs.length > 0) {
    await payload.update({
      collection,
      id: existing.docs[0].id,
      data: data as any,
    })
  } else {
    await payload.create({ collection, data: data as any })
  }
}

async function upsertKeywordRanking(
  payload: Payload,
  date: string,
  keyword: string,
  data: Record<string, any>,
) {
  const existing = await payload.find({
    collection: 'analytics-keyword-rankings',
    where: {
      and: [
        { snapshotDate: { like: date } } as any,
        { keyword: { equals: keyword } },
      ],
    } as any,
    limit: 1,
  })
  if (existing.docs.length > 0) {
    await payload.update({
      collection: 'analytics-keyword-rankings',
      id: existing.docs[0].id,
      data: data as any,
    })
  } else {
    await payload.create({ collection: 'analytics-keyword-rankings', data: data as any })
  }
}

export async function runDataForSeoSnapshot(payload: Payload): Promise<RunResult> {
  const date = todayIso()
  const result: RunResult = {
    ourProfile: { ok: false },
    keywordRankings: { ok: false },
    competitors: [],
    date,
  }

  // 1. Pull our profile (used for both keyword ranking lookups and gap analysis)
  let ourProfile: DomainProfile | null = null
  try {
    ourProfile = await fetchDomainProfile(OUR_DOMAIN, 1000)
    result.ourProfile = {
      ok: true,
      rankedKeywordsCount: ourProfile.rankedKeywordsCount,
      estimatedTraffic: ourProfile.estimatedTraffic,
    }
  } catch (err: any) {
    result.ourProfile = { ok: false, error: err?.message ?? 'unknown' }
    console.error('[dataforseo-runner] our profile fetch failed', err)
    // Without our profile, neither keyword rankings nor gap analysis can run
    return result
  }

  // 1b. Persist our profile as a snapshot under our own domain so the
  // Overview dashboard can show "where we currently rank" without
  // re-querying DataForSEO. Stores the full top 1000 we fetched so the
  // gap-analysis matrix doesn't lose long-tail keywords that fall below a
  // top-500 cutoff but still rank for us. gap/overlap fields are left
  // empty since they don't apply to us.
  try {
    const ourTopKeywords = ourProfile.keywords.slice(0, 1000).map((k) => ({
      keyword: k.keyword,
      position: k.position,
      searchVolume: k.searchVolume,
      url: k.url,
    }))
    await upsertByDateAndDomain(payload, 'analytics-competitor-snapshots', date, OUR_DOMAIN, {
      snapshotDate: date,
      domain: OUR_DOMAIN,
      estimatedTraffic: ourProfile.estimatedTraffic,
      rankedKeywordsCount: ourProfile.rankedKeywordsCount,
      overlapWithUs: null,
      topKeywords: ourTopKeywords,
      gapKeywords: [],
    })
  } catch (err: any) {
    console.error('[dataforseo-runner] our profile snapshot write failed', err)
  }

  // 2. Per-tracked-keyword position rows
  try {
    const trackedKeywords = await payload.find({
      collection: 'tracked-keywords',
      where: { active: { equals: true } },
      limit: 100,
      depth: 0,
    })
    let written = 0
    for (const kw of trackedKeywords.docs as any[]) {
      const match = findKeywordRanking(ourProfile, kw.keyword)
      await upsertKeywordRanking(payload, date, kw.keyword, {
        snapshotDate: date,
        keyword: kw.keyword,
        location: kw.location ?? null,
        position: match?.position ?? null,
        url: match?.url ?? null,
        searchVolume: match?.searchVolume ?? null,
      })
      written++
    }
    result.keywordRankings = { ok: true, written }
  } catch (err: any) {
    result.keywordRankings = { ok: false, error: err?.message ?? 'unknown' }
    console.error('[dataforseo-runner] keyword rankings write failed', err)
  }

  // 3. Per-competitor snapshots
  try {
    const competitors = await payload.find({
      collection: 'tracked-competitors',
      where: { active: { equals: true } },
      limit: 20,
      depth: 0,
    })
    for (const comp of competitors.docs as any[]) {
      const domain = normalizeDomain(comp.domain)
      if (!domain) continue
      try {
        const theirProfile = await fetchDomainProfile(domain, 1000)
        // Store the full top 1000 we fetched so the gap-analysis matrix
        // has the broadest possible keyword overlap surface. Costs nothing
        // extra in API spend since one call already returns up to 1000.
        const topKeywords = theirProfile.keywords.slice(0, 1000).map((k) => ({
          keyword: k.keyword,
          position: k.position,
          searchVolume: k.searchVolume,
          url: k.url,
        }))
        const gapKeywords = computeGapKeywords(ourProfile.keywords, theirProfile.keywords, 25)
        const overlapWithUs = computeOverlapCount(ourProfile.keywords, theirProfile.keywords)
        await upsertByDateAndDomain(payload, 'analytics-competitor-snapshots', date, domain, {
          snapshotDate: date,
          domain,
          estimatedTraffic: theirProfile.estimatedTraffic,
          rankedKeywordsCount: theirProfile.rankedKeywordsCount,
          overlapWithUs,
          topKeywords,
          gapKeywords,
        })
        result.competitors.push({ domain, ok: true })
      } catch (err: any) {
        result.competitors.push({ domain, ok: false, error: err?.message ?? 'unknown' })
        console.error(`[dataforseo-runner] competitor ${domain} failed`, err)
      }
    }
  } catch (err: any) {
    console.error('[dataforseo-runner] competitor pass failed', err)
  }

  return result
}
