import { json, type LoaderFunction } from "@remix-run/node";

function ok<T>(data: T) {
  return json({ ok: true, ...data }, { headers: { "Cache-Control": "no-store" } });
}
function fail(message: string, extra: any = {}) {
  return json({ ok: false, error: message, ...extra }, { status: 500, headers: { "Cache-Control": "no-store" } });
}

export const loader: LoaderFunction = async ({ request }) => {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("target");
  if (!target) return fail("Missing ?target");

  try {
    const res = await fetch(target, { headers: { "Cache-Control": "no-cache" } });
    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await res.json() : await res.text();

    return ok({
      status: res.status,
      okStatus: res.ok,
      json: isJson,
      sample: isJson ? {
        keys: Object.keys(payload).slice(0, 10),
        counts: {
          nodes: Array.isArray(payload.nodes) ? payload.nodes.length : undefined,
          edges: Array.isArray(payload.edges) ? payload.edges.length : undefined,
        }
      } : String(payload).slice(0, 200)
    });
  } catch (e: any) {
    return fail(e.message || 'Request failed');
  }
};

