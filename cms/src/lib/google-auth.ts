/**
 * OAuth refresh-token auth for Google APIs (GA4, Search Console).
 *
 * We use OAuth + refresh token instead of service-account JWT because GA4
 * and GSC's add-user dialogs sometimes reject newly-created service
 * account emails (a known quirk where they aren't recognized as Google
 * Accounts by other Google products). OAuth uses the existing GA4/GSC
 * permissions on a real Google account that already has access — no
 * need to add anyone as a viewer anywhere.
 *
 * The refresh token is minted once via Google's OAuth Playground and
 * stored as the GOOGLE_OAUTH_REFRESH_TOKEN Worker secret. Refresh tokens
 * for "external" OAuth apps in test publishing mode expire in 7 days.
 * To extend indefinitely, publish the OAuth consent screen (App
 * verification not required for personal use, just one click).
 *
 * Reads three Worker secrets:
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *   GOOGLE_OAUTH_REFRESH_TOKEN
 */

interface CachedToken {
  token: string
  expiresAt: number // epoch ms
}

const tokenCache = new Map<string, CachedToken>()

const ANALYTICS_READONLY = 'https://www.googleapis.com/auth/analytics.readonly'
const WEBMASTERS_READONLY = 'https://www.googleapis.com/auth/webmasters.readonly'

/** Both scopes joined as Google expects (space-separated). */
export const GOOGLE_SCOPES = `${ANALYTICS_READONLY} ${WEBMASTERS_READONLY}`

const TOKEN_URI = 'https://oauth2.googleapis.com/token'

function readEnv(name: string): string | undefined {
  return (
    (globalThis as any).process?.env?.[name] ??
    (typeof process !== 'undefined' ? process.env?.[name] : undefined)
  )
}

function getOAuthCreds(): { clientId: string; clientSecret: string; refreshToken: string } {
  const clientId = readEnv('GOOGLE_OAUTH_CLIENT_ID')
  const clientSecret = readEnv('GOOGLE_OAUTH_CLIENT_SECRET')
  const refreshToken = readEnv('GOOGLE_OAUTH_REFRESH_TOKEN')
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'OAuth secrets missing: need GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN as Worker secrets.',
    )
  }
  return { clientId, clientSecret, refreshToken }
}

async function exchangeRefreshToken(): Promise<{ accessToken: string; expiresIn: number }> {
  const { clientId, clientSecret, refreshToken } = getOAuthCreds()
  const res = await fetch(TOKEN_URI, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Google OAuth refresh failed (${res.status}): ${errText}`)
  }

  const data = (await res.json()) as {
    access_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }
  if (!data.access_token) {
    throw new Error(
      `Google OAuth response missing access_token: ${data.error_description ?? data.error ?? 'unknown'}`,
    )
  }
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 3600,
  }
}

/**
 * Get a cached access token. Re-mints when the cached token has under
 * 5 minutes of life remaining. Single-token model — both GA4 and GSC
 * scopes are granted in the refresh token, so one access token serves
 * both.
 */
export async function getAccessToken(scopeKey: string = GOOGLE_SCOPES): Promise<string> {
  const cached = tokenCache.get(scopeKey)
  const now = Date.now()
  if (cached && cached.expiresAt - now > 5 * 60 * 1000) {
    return cached.token
  }
  const { accessToken, expiresIn } = await exchangeRefreshToken()
  tokenCache.set(scopeKey, { token: accessToken, expiresAt: now + expiresIn * 1000 })
  return accessToken
}
