import React, { useEffect, useMemo, useState } from 'react';

interface Props {
  onGraphUpdate: (data: any) => void;
}

type Health = { ok: boolean; okStatus?: boolean; status?: number; json?: boolean; sample?: any; error?: string };

const SOURCES = {
  curated: { label: 'Curated JSON', url: '/api/graph' },
  supabase: { label: 'Supabase (Raw)', url: '/api/graph/supabase/raw?limit=400' },
  cognee: { label: 'Cognee (Refined)', url: '/api/graph/cognee?limit=2000' },
} as const;


const SourceSwitcher: React.FC<Props> = ({ onGraphUpdate }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<Record<string, Health>>({});

  async function parseJsonSafe(res: Response) {
    try {
      return await res.json();
    } catch {
      const text = await res.text();
      return { error: `Non-JSON response (${res.status})`, raw: text } as any;
    }
  }

  async function healthCheck(url: string): Promise<Health> {
    const absolute = (() => {
      try { return new URL(url, window.location.origin).toString(); } catch { return url; }
    })();

    // Try server-side probe first; if it doesn't confirm ok, fall back to direct GET
    try {
      const probe = await fetch(`/api/graph/health?target=${encodeURIComponent(absolute)}&t=${Date.now()}`);
      if (probe.ok) {
        const report = await probe.json();
        if (report?.ok && report?.okStatus !== false) return report;
      }
      // If server probe fails or not ok, continue to fallback
    } catch {}

    // Fallback: client-side check
    try {
      const res = await fetch(absolute, { cache: 'no-store' });
      const ok = res.ok;
      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      let payload: any = null;
      try { payload = isJson ? await res.json() : await res.text(); } catch {}
      return {
        ok: true,
        okStatus: ok,
        status: res.status,
        json: isJson,
        sample: isJson && payload ? {
          keys: Object.keys(payload).slice(0, 10),
          counts: {
            nodes: Array.isArray(payload.nodes) ? payload.nodes.length : undefined,
            edges: Array.isArray(payload.edges) ? payload.edges.length : undefined,
          }
        } : undefined
      };
    } catch (e) {
      return { ok: false, error: String(e) } as any;
    }
  }

  async function refreshHealth() {
    const entries = await Promise.all(
      Object.entries(SOURCES).map(async ([key, src]) => [key, await healthCheck(src.url)] as const)
    );
    const next: Record<string, Health> = {};
    for (const [k, v] of entries) next[k] = v;
    setHealth(next);
  }

  useEffect(() => {
    if (open) {
      refreshHealth();
    }
  }, [open]);

  function reasonFor(urlKey: keyof typeof SOURCES): string | null {
    const h = health[urlKey];
    if (!h) return null;
    if (h.ok && h.okStatus !== false) return null;
    if (urlKey === 'supabase' || urlKey === 'cognee') {
      return 'Check SUPABASE_URL and SUPABASE_SERVICE_KEY in env.';
    }
    return h.error || 'Endpoint unavailable';
  }

  async function loadFrom(url: string) {
    try {
      setBusy(true);

      const before = await healthCheck(url);
      if (!before.ok || before.okStatus === false) {
        console.warn('Health check did not confirm OK, attempting direct fetch anyway', url, before);
      }

      const absolute = (() => { try { return new URL(url, window.location.origin).toString(); } catch { return url; } })();
      const res = await fetch(absolute, { cache: 'no-store' });
      if (!res.ok) {
        const payload = await parseJsonSafe(res);
        console.error('SourceSwitcher loadFrom failed:', url, res.status, payload);
        alert(`Failed to load graph: ${res.status}. See console for details.`);
        return;
      }
      const data = await parseJsonSafe(res);
      onGraphUpdate(data);
    } catch (e) {
      console.error('SourceSwitcher loadFrom error', url, e);
      alert('Failed to load graph. Check console.');
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  // Keep buttons enabled; we validate live and show tooltips, but do not block selection
  const disabled = useMemo(() => ({
    curated: busy,
    supabase: busy,
    cognee: busy,
  }), [busy]);

  const counts = (key: keyof typeof SOURCES) => {
    const h = health[key];
    if (!h || !h.sample || !h.sample.counts) return '';
    const n = h.sample.counts.nodes ?? '?';
    const e = h.sample.counts.edges ?? '?';
    return ` (${n} nodes${e !== undefined ? ", " + e + " edges" : ''})`;
  };

  return (
    <div className="relative" style={{ zIndex: 10001 }}>
      <button
        onClick={() => setOpen(!open)}
        className="ml-2 px-3 py-2 rounded-lg bg-white/90 text-gray-800 border border-gray-300 shadow hover:bg-white transition"
        title="Select graph source"
      >
        {busy ? 'Loading…' : 'Source'}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 p-3 bg-white border rounded-lg shadow-lg z-50">
          <div className="text-xs text-gray-500 mb-2 flex items-center justify-between">
            <span>Load graph from</span>
            <button className="text-xs text-blue-600 hover:underline" onClick={refreshHealth}>Validate</button>
          </div>
          <div className="flex flex-col gap-2">
            <button className="px-2 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 text-left disabled:opacity-50" onClick={() => loadFrom(SOURCES.curated.url)} disabled={disabled.curated}>
              {SOURCES.curated.label}{counts('curated')}
            </button>
            <button className="px-2 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 text-left disabled:opacity-50" onClick={() => loadFrom(SOURCES.supabase.url)} disabled={disabled.supabase} title={reasonFor('supabase') || ''}>
              {SOURCES.supabase.label}{counts('supabase')}
            </button>
            <button className="px-2 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 text-left disabled:opacity-50" onClick={() => loadFrom(SOURCES.cognee.url)} disabled={disabled.cognee} title={reasonFor('cognee') || ''}>
              {SOURCES.cognee.label}{counts('cognee')}
            </button>
          </div>
          <div className="text-[11px] text-gray-500 mt-2">Switch sources any time.</div>
        </div>
      )}
    </div>
  );
};

export default SourceSwitcher;

