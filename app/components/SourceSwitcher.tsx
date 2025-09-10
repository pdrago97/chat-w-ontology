import React, { useEffect, useMemo, useState } from 'react';

interface Props {
  onGraphUpdate: (data: any) => void;
}

type Health = { ok: boolean; okStatus?: boolean; status?: number; json?: boolean; sample?: any; error?: string };

const SOURCES = {
  curated: { label: 'Curated JSON', url: '/api/graph' },
  supabase: { label: 'Supabase (Raw)', url: '/api/graph/supabase/raw?limit=400' },
  cognee: { label: 'Cognee (Refined)', url: '/api/graph/cognee?limit=2000' },
  langextractDb: { label: 'LangExtract (DB)', url: '/api/graph/langextract/db', devOnly: true },
  langextract: { label: 'LangExtract (Curated)', url: '/api/graph/langextract/curated' },
  graphdb: { label: 'GraphDB (SPARQL)', url: '/api/graph/graphdb?limit=2000', devOnly: true },
} as const;


const SourceSwitcher: React.FC<Props> = ({ onGraphUpdate }) => {
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<Record<string, Health>>({});


  // Filter out dev-only sources in production
  const isProduction = typeof window !== 'undefined' &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.includes('127.0.0.1') &&
    !window.location.hostname.includes('.local');

  const availableSources = Object.entries(SOURCES).filter(([_, config]) =>
    !isProduction || !(config as any).devOnly
  ).map(([key]) => key as keyof typeof SOURCES);

  // Debug log for production filtering
  React.useEffect(() => {
    console.log(`🔧 SourceSwitcher: isProduction=${isProduction}, availableSources:`, availableSources);
  }, [isProduction, availableSources]);

  // Prioritize Cognee first, then other sources
  const ORDER: (keyof typeof SOURCES)[] = ['cognee', 'curated', 'supabase', 'langextractDb', 'langextract', 'graphdb'].filter(
    key => availableSources.includes(key)
  );

  // Default to Cognee if available, otherwise first available source
  const defaultSource = availableSources.includes('cognee') ? 'cognee' : (availableSources[0] || 'curated');
  const [current, setCurrent] = useState<keyof typeof SOURCES>(defaultSource);

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
    // Preload health information for quick glance counts
    refreshHealth();

    // Auto-load Cognee data on mount if it's the default source
    if (defaultSource === 'cognee') {
      loadFrom('cognee');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  async function tryFetch(key: keyof typeof SOURCES) {
    const url = SOURCES[key].url;
    const before = await healthCheck(url).catch(()=>({ ok:false } as any));
    if (!before.ok || before.okStatus === false) {
      console.warn('Health check not OK, trying fetch anyway', url, before);
    }
    const absolute = (() => { try { return new URL(url, window.location.origin).toString(); } catch { return url; } })();
    const res = await fetch(absolute, { cache: 'no-store' });
    if (!res.ok) {
      const payload = await parseJsonSafe(res);
      console.warn('loadFrom failed for', url, res.status, payload);
      return null;
    }
    const data = await parseJsonSafe(res);
    return data;
  }

  async function loadFrom(startKey: keyof typeof SOURCES): Promise<boolean> {
    try {
      setBusy(true);
      const startIdx = ORDER.indexOf(startKey);
      for (let i = 0; i < ORDER.length; i++) {
        const idx = (startIdx + i) % ORDER.length;
        const key = ORDER[idx];
        const data = await tryFetch(key);
        if (data) {
          onGraphUpdate(data);
          setCurrent(key);
          return true;
        }
      }
      alert('No sources loaded successfully. Check server logs and env variables.');
      return false;
    } catch (e) {
      console.error('SourceSwitcher loadFrom error starting at', startKey, e);
      alert('Failed to load graph. Check console.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleClick() {
    const original = current;
    const target = nextKey(current);
    setCurrent(target); // optimistic label change
    const ok = await loadFrom(target);
    if (!ok) setCurrent(original);
  }

  // Keep buttons enabled; we validate live and show tooltips, but do not block selection
  const disabled = useMemo(() => {
    const result: Record<string, boolean> = {};
    availableSources.forEach(source => {
      result[source] = busy;
    });
    return result;
  }, [busy, availableSources]);

  const counts = (key: keyof typeof SOURCES) => {
    const h = health[key];
    if (!h || !h.sample || !h.sample.counts) return '';
    const n = h.sample.counts.nodes ?? '?';
    const e = h.sample.counts.edges ?? '?';
    return `${n}${e !== undefined ? '•' + e : ''}`;
  };

  const colorClass = (key: keyof typeof SOURCES, selected: boolean) => {
    const common = 'px-2.5 py-1.5 rounded-full text-sm font-medium border shadow-sm focus:outline-none focus:ring-2 transition';
    if (selected) {
      switch (key) {
        case 'curated': return `${common} bg-slate-900 border-slate-900 text-white focus:ring-slate-900/40`;
        case 'supabase': return `${common} bg-cyan-600 border-cyan-600 text-white focus:ring-cyan-700/40`;
        case 'cognee': return `${common} bg-violet-600 border-violet-600 text-white focus:ring-violet-700/40`;
      }
    }
    return `${common} bg-white text-slate-900 border-slate-300 hover:bg-slate-50`;
  };

  const nextKey = (k: keyof typeof SOURCES): keyof typeof SOURCES => {
    const idx = ORDER.indexOf(k);
    return ORDER[(idx + 1) % ORDER.length];
  };

  const btnClass = colorClass(current, true);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <button
        aria-label={`Source: ${SOURCES[current].label}`}
        title={`Click to switch source — current: ${SOURCES[current].label}`}
        className={btnClass}
        disabled={disabled[current]}
        onClick={handleClick}
        style={{ zIndex: 10001, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        <span>{SOURCES[current].label}</span>
        <span className="ml-1 text-[10px] opacity-80">{counts(current)}</span>
      </button>
    </div>
  );
};

export default SourceSwitcher;

