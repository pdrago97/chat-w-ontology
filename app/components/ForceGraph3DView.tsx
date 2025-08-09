/*
  High-contrast UI improvements for 3D view
  - Buttons and badges now use darker borders and clearer text colors
  - Modal content uses darker text on white
*/

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useLanguage } from '../contexts/LanguageContext';
import { translateGraphData } from '../services/graphTranslation';

// Lazy-load heavy deps only on client to avoid SSR window references
let ForceGraph3D: any = null;
let EffectComposer: any = null;
let RenderPass: any = null;
let UnrealBloomPass: any = null;

const loadClientDeps = async () => {
  if (typeof window === 'undefined') return;
  if (!ForceGraph3D) {
    const fg = await import('3d-force-graph');
    ForceGraph3D = fg.default || fg;
  }
  if (!EffectComposer) {
    const mod = await import('three/examples/jsm/postprocessing/EffectComposer.js');
    EffectComposer = mod.EffectComposer;
  }
  if (!RenderPass) {
    const mod = await import('three/examples/jsm/postprocessing/RenderPass.js');
    RenderPass = mod.RenderPass;
  }
  if (!UnrealBloomPass) {
    const mod = await import('three/examples/jsm/postprocessing/UnrealBloomPass.js');
    UnrealBloomPass = mod.UnrealBloomPass;
  }
};

interface ForceGraph3DViewProps {
  graphData: any;
}

// Simple color palette matching 2D types
const colorByType = (type?: string) => {
  // High-contrast, modern palette
  switch ((type || 'default').toLowerCase()) {
    case 'person': return '#22c55e';      // green-500
    case 'experience': return '#a855f7';  // purple-500
    case 'education': return '#3b82f6';   // blue-500
    case 'skills': return '#f97316';      // orange-500
    case 'project': return '#f59e0b';     // amber-500
    case 'group': return '#06b6d4';       // cyan-500
    case 'status': return '#ef4444';      // red-500
    default: return '#64748b';            // slate-500
  }
};

export default function ForceGraph3DView({ graphData }: ForceGraph3DViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<any>(null);
  const composerRef = useRef<any>(null);
  const bloomRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState<{w:number;h:number}>({ w: 0, h: 0 });
  const [counts, setCounts] = useState<{nodes:number;links:number}>({ nodes: 0, links: 0 });
  const { language } = useLanguage();

  // Prepare data with flexible mapping
  const toFGData = (data: any) => {
    const safe = data || { nodes: [], edges: [] };
    const nodes = (safe.nodes || []).map((n: any, i: number) => ({
      id: String(n.id || n.name || `node_${i}`),
      label: String(n.label || n.name || n.id || `Node ${i}`),
      type: String(n.type || 'Unknown'),
      ...n
    }));
    const validIds = new Set(nodes.map((n: any) => n.id));
    const links = (safe.edges || safe.links || []).filter((e: any) => {
      const s = String(e.source || e.from || '');
      const t = String(e.target || e.to || '');
      return s && t && validIds.has(s) && validIds.has(t);
    }).map((e: any, i: number) => ({
      id: String(e.id || `edge_${i}`),
      source: String(e.source || e.from),
      target: String(e.target || e.to),
      relation: String(e.relation || e.label || ''),
      ...e
    }));
    return { nodes, links };
  };

  // Setup graph
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (typeof window === 'undefined') return;
      if (!containerRef.current) return;

      // ensure client-only deps are loaded
      await loadClientDeps();
      if (!ForceGraph3D || cancelled) return;

      // translate data for labels
      const translated = translateGraphData(graphData, language);
      const fgData = toFGData(translated);

      // init graph
      const fg = ForceGraph3D()(containerRef.current);
      if (cancelled) return;
      fgRef.current = fg;
      setCounts({ nodes: fgData.nodes.length, links: fgData.links.length });

      // node visuals
      fg
        .graphData(fgData)
        .nodeId('id')
        .nodeLabel((n: any) => n.label || n.id)
        .nodeVal((n: any) => 2 + Math.max(1, (n?._degree || 0)))
        .nodeColor((n: any) => {
          const base = colorByType(n.type);
          if (hoverNodeId && (n.id === hoverNodeId)) {
            return new THREE.Color(base).offsetHSL(0, 0, 0.2).getStyle();
          }
          return base;
        })
        .linkColor(() => 'rgba(71, 85, 105, 0.65)') // slate-600
        .linkDirectionalParticles(0)
        .linkWidth(0.8)
        .backgroundColor('#f8fafc') // slate-50
        .onNodeHover((n: any) => setHoverNodeId(n ? String(n.id) : null))
        .onNodeClick((n: any) => {
          const dist = 80;
          const pos = n.x && n.y && n.z ? { x: n.x, y: n.y, z: n.z } : { x: 0, y: 0, z: 0 };
          const length = Math.hypot(pos.x, pos.y, pos.z) || 1;
          const newPos = { x: pos.x * (1 + dist / length), y: pos.y * (1 + dist / length), z: pos.z * (1 + dist / length) };
          fg.cameraPosition(newPos, pos, 800);
          showInfoModal(n);
        });

      // Add bloom post-processing like the example
      const renderer = fg.renderer() as THREE.WebGLRenderer;
      const scene = fg.scene();
      const camera = fg.camera();

      const size = new THREE.Vector2();
      renderer.getSize(size);

      if (EffectComposer && RenderPass && UnrealBloomPass) {
        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 1.2, 1.0, 0.0);
        composer.addPass(bloom);

        if (typeof (fg as any).postProcessingComposer === 'function') {
          (fg as any).postProcessingComposer(composer);
        } else {
          console.warn('postProcessingComposer not available; skipping bloom fallback to avoid double-render.');
        }
        composerRef.current = composer;
        bloomRef.current = bloom;
      }

      // orbit controls
      const controls: any = fg.controls();
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 0.6;

      // resize handler
      const onResize = () => {
        if (!containerRef.current) return;
        const { clientWidth: w, clientHeight: h } = containerRef.current;
        setSize({ w, h });
        if (fgRef.current) {
          fgRef.current.width(w);
          fgRef.current.height(h);
        }
        composerRef.current?.setSize(w, h);
      };
      window.addEventListener('resize', onResize);
      setTimeout(onResize, 0);

      // cleanup
      return () => {
        window.removeEventListener('resize', onResize);
      };
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if ((fgRef.current as any)?._destructor) {
        (fgRef.current as any)._destructor();
      }
      fgRef.current = null;
      composerRef.current = null;
      bloomRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData, language]);

  // apply auto-rotate changes
  useEffect(() => {
    if (!fgRef.current) return;
    const controls: any = fgRef.current.controls();
    controls.autoRotate = autoRotate;
  }, [autoRotate]);

  const resetCamera = () => {
    if (!fgRef.current) return;
    fgRef.current.zoomToFit(400);
  };

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* Bottom-right: 3D controls so 2D/3D toggle at bottom-left stays clickable */}
      <div style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 10001, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          onClick={resetCamera}
          className="px-3 py-2 rounded-lg bg-white text-slate-900 border border-slate-300 shadow hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-900/40"
          title="Reset camera"
        >Reset camera</button>
        <button
          onClick={() => setAutoRotate(v => !v)}
          className="px-2.5 py-1.5 rounded-md bg-white text-slate-900 border border-slate-300 shadow hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-900/40"
          title="Toggle auto-rotate"
        >{autoRotate ? 'Auto-rotate: On' : 'Auto-rotate: Off'}</button>
      </div>

      {/* small debug badge top-right, offset from chat/controls */}
      <div style={{ position: 'absolute', top: 16, right: 240, zIndex: 10000, fontSize: 12, background: 'rgba(255,255,255,0.85)', padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', color: '#111' }}>
        container: {size.w}x{size.h} • nodes: {counts.nodes} • edges: {counts.links} {error ? ` • error: ${error}` : ''}
      </div>

      <div ref={containerRef} style={{ position: 'absolute', inset: 0, background: '#f5f7fa' }} />
    </div>
  );
}

// Minimal modal for node details
function showInfoModal(data: any) {
  const existing = document.querySelector('.modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(2,6,23,0.55);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:9999;opacity:0;`;

  const content = document.createElement('div');
  content.className = 'modal-content';
  content.style.cssText = `background:rgba(255,255,255,0.95);border-radius:16px;padding:24px;max-width:600px;width:90vw;max-height:80vh;overflow:auto;box-shadow:0 25px 50px rgba(0,0,0,0.2)`;
  content.innerHTML = renderNodeHtml(data);

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => { overlay.style.transition = 'opacity .3s ease'; overlay.style.opacity = '1'; });

  const close = () => { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 250); };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); }, { once: true });
}

function renderNodeHtml(data: any) {
  if (!data) return '<h3>No data</h3>';
  const title = data.label || data.name || data.id || 'Node';
  const type = data.type ? `<div style="font-size:12px;color:#666;margin-bottom:8px">${data.type}</div>` : '';
  const kv = Object.entries(data)
    .filter(([k, v]) => !['fx','fy','fz','vx','vy','vz','x','y','z','__indexColor'].includes(k) && v !== null && v !== undefined)
    .map(([k, v]) => `<div style="margin:6px 0"><strong>${k}:</strong> ${typeof v === 'object' ? JSON.stringify(v) : v}</div>`)
    .join('');
  return `<h3 style="margin:0 0 8px 0">${title}</h3>${type}${kv || '<div>No fields</div>'}`;
}

