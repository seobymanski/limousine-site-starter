import type { APIRoute } from 'astro';

const CMS_URL =
  import.meta.env.PAYLOAD_CMS_URL ?? 'https://CLIENT-cms.workers.dev';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const res = await fetch(`${CMS_URL}/api/sign-petition`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[api/sign-petition] relay failed', err);
    return new Response(
      JSON.stringify({ error: 'Could not record signature. Please try again.' }),
      { status: 500, headers: { 'content-type': 'application/json' } },
    );
  }
};
