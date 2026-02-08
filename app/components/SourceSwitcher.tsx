import React, { useEffect, useMemo, useState } from 'react';

interface Props {
  onGraphUpdate: (data: any) => void;
}

type Health = { ok: boolean; okStatus?: boolean; status?: number; json?: boolean; sample?: any; error?: string };

const SOURCES = {
  optimized: { label: 'Knowledge Graph (Optimized)', url: '/api/graph/optimized' },
  adminGraph: { label: 'Admin Graph', url: '/api/graph' },
  curated: { label: 'knowledge-graph.json', url: '/api/graph' },
  supabase: { label: 'Supabase Raw Data', url: '/api/graph/supabase/raw?limit=400' },
  cognee: { label: 'Cognee Processed', url: '/api/graph/cognee?limit=2000' },
  langextractDb: { label: 'LangExtract DB', url: '/api/graph/langextract/db', devOnly: true },
  langextract: { label: 'LangExtract Curated', url: '/api/graph/langextract/curated' },
  graphdb: { label: 'GraphDB SPARQL', url: '/api/graph/graphdb?limit=2000', devOnly: true },
} as const;


const SourceSwitcher: React.FC<Props> = ({ onGraphUpdate }) => {
  const [busy, setBusy] = useState(false);
  const [health, setHealth] = useState<Record<string, Health>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

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

  // Prioritize Optimized first, then other sources
  const ORDER: (keyof typeof SOURCES)[] = ['optimized', 'adminGraph', 'cognee', 'curated', 'supabase', 'langextractDb', 'langextract', 'graphdb'].filter(
    key => availableSources.includes(key)
  );

  // Default to curated local graph (comprehensive knowledge-graph.json)
  const defaultSource = availableSources.includes('curated') ? 'curated' :
                        availableSources.includes('adminGraph') ? 'adminGraph' :
                        (availableSources[0] || 'curated');
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

    // No auto-load needed - data comes from the loader in _index.tsx
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

  const getCounts = (key: keyof typeof SOURCES) => {
    const h = health[key];
    if (!h || !h.sample || !h.sample.counts) return '';
    const n = h.sample.counts.nodes ?? '?';
    const e = h.sample.counts.edges ?? '?';
    return `${n}${e !== undefined ? '\u2022' + e : ''}`;
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <button
        aria-label={`Source: ${SOURCES[current].label}`}
        title={`Click to select source — current: ${SOURCES[current].label}`}
        disabled={busy}
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{
          zIndex: 10001,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 9999,
          fontSize: 12,
          fontWeight: 500,
          border: '1px solid',
          borderColor: isDark ? '#4b5563' : '#cbd5e1',
          background: isDark ? 'rgba(31,41,55,0.9)' : 'rgba(255,255,255,0.9)',
          color: isDark ? '#e5e7eb' : '#0f172a',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
          cursor: busy ? 'not-allowed' : 'pointer',
          opacity: busy ? 0.6 : 1,
          transition: 'all 0.2s ease',
          outline: 'none',
        }}
      >
        <span>{SOURCES[current].label}</span>
        <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.8 }}>{getCounts(current)}</span>
        <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20" style={{ marginLeft: 4 }}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {dropdownOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 10000 }}
            onClick={() => setDropdownOpen(false)}
          />
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            width: 220,
            background: isDark ? '#1f2937' : '#ffffff',
            border: `1px solid ${isDark ? '#4b5563' : '#cbd5e1'}`,
            borderRadius: 8,
            boxShadow: isDark
              ? '0 4px 16px rgba(0,0,0,0.4)'
              : '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 10002,
            maxHeight: 256,
            overflowY: 'auto',
          }}>
            {availableSources.map((key, idx) => {
              const source = SOURCES[key];
              const isSelected = key === current;
              const h = health[key];
              const counts = h?.sample?.counts ? `${h.sample.counts.nodes || '?'}\u2022${h.sample.counts.edges || '?'}` : '';

              return (
                <div
                  key={key}
                  style={{
                    padding: '8px 12px',
                    fontSize: 13,
                    cursor: 'pointer',
                    borderBottom: idx < availableSources.length - 1
                      ? `1px solid ${isDark ? '#374151' : '#f1f5f9'}`
                      : 'none',
                    background: isSelected
                      ? (isDark ? '#374151' : '#f1f5f9')
                      : 'transparent',
                    color: isSelected
                      ? (isDark ? '#ffffff' : '#0f172a')
                      : (isDark ? '#d1d5db' : '#475569'),
                    fontWeight: isSelected ? 500 : 400,
                    transition: 'background 0.15s ease',
                  }}
                  onClick={async () => {
                    setDropdownOpen(false);
                    if (key !== current) {
                      setCurrent(key);
                      const ok = await loadFrom(key);
                      if (!ok) setCurrent(current);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      (e.target as HTMLElement).style.background = isDark ? '#2d3748' : '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      (e.target as HTMLElement).style.background = 'transparent';
                    }
                  }}
                >
                  {source.label}
                  {counts && (
                    <span style={{
                      float: 'right',
                      fontSize: 11,
                      color: isDark ? '#9ca3af' : '#94a3b8',
                    }}>
                      {counts}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default SourceSwitcher;
