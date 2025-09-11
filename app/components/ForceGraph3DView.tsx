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
  const [hoveredNode, setHoveredNode] = useState<any>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const { language } = useLanguage();

  // Prepare data with flexible mapping
  const toFGData = (data: any) => {
    const safe = data || { nodes: [], edges: [] };

    // Remove heavy/internal fields so UI doesn't show engine internals
    const sanitize = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      const out: any = {};
      for (const [k, v] of Object.entries(obj)) {
        if (k.startsWith('__')) continue; // e.g., __threeObj, __lineObj, __indexColor
        if (['fx','fy','fz','vx','vy','vz','x','y','z','index'].includes(k)) continue;
        out[k] = v;
      }
      return out;
    };

    // Deep-clean for modal/inspection to avoid showing engine internals and circular refs
    const cleanForModal = (obj: any) => {
      const seen = new WeakSet();
      const rec = (o: any): any => {
        if (o === null || o === undefined) return o;
        if (typeof o !== 'object') return o;
        if (seen.has(o)) return undefined;
        seen.add(o);
        if (Array.isArray(o)) return o.map(rec).filter(v => v !== undefined);
        const out: any = {};
        for (const [k, v] of Object.entries(o)) {
          if (k.startsWith('__')) continue;
          if (['fx','fy','fz','vx','vy','vz','x','y','z','index','__indexColor'].includes(k)) continue;
          const sv = rec(v);
          if (sv !== undefined) out[k] = sv;
        }
        return out;
      };
      return rec(obj);
    };

    const nodes = (safe.nodes || []).map((n: any, i: number) => {
      const s = sanitize(n) || {};
      const id = String(s.id || s.name || `node_${i}`);
      const label = String(s.label || s.name || s.id || `Node ${i}`);
      const type = String(s.type || 'Unknown');
      // stash a cleaned copy for modal usage
      const clean = cleanForModal({ id, label, type, ...s });
      return { ...clean };
    });

    const validIds = new Set(nodes.map((n: any) => n.id));

    const links = (safe.edges || safe.links || []).filter((e: any) => {
      const s = String(e.source || e.from || '');
      const t = String(e.target || e.to || '');
      return s && t && validIds.has(s) && validIds.has(t);
    }).map((e: any, i: number) => {
      const s = sanitize(e) || {};
      return {
        id: String(s.id || `edge_${i}`),
        source: String(s.source || s.from),
        target: String(s.target || s.to),
        relation: String(s.relation || s.label || ''),
        ...s
      };
    });

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

      // Create text sprite for node labels
      const createTextSprite = (text: string, color: string = '#000000') => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        const fontSize = 48;
        context.font = `${fontSize}px Arial, sans-serif`;
        context.fillStyle = color;
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        // Measure text and set canvas size
        const metrics = context.measureText(text);
        canvas.width = Math.max(metrics.width + 20, 100);
        canvas.height = fontSize + 20;

        // Redraw text after canvas resize
        context.font = `${fontSize}px Arial, sans-serif`;
        context.fillStyle = color;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(canvas.width / 10, canvas.height / 10, 1);

        return sprite;
      };

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
        .nodeThreeObject((n: any) => {
          // Create a group to hold both the sphere and text
          const group = new THREE.Group();

          // Create the sphere (node)
          const sphereGeometry = new THREE.SphereGeometry(2 + Math.max(1, (n?._degree || 0)));
          const sphereMaterial = new THREE.MeshLambertMaterial({
            color: colorByType(n.type),
            transparent: true,
            opacity: 0.8
          });
          const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
          group.add(sphere);

          // Create text sprite for the label
          const label = n.label || n.name || n.id || 'Node';
          const textSprite = createTextSprite(label, '#333333');
          textSprite.position.set(0, 8, 0); // Position above the node
          group.add(textSprite);

          return group;
        })
        .linkColor(() => 'rgba(71, 85, 105, 0.65)') // slate-600
        .linkDirectionalParticles(0)
        .linkWidth(0.8)
        .backgroundColor('#f8fafc') // slate-50
        .onNodeHover((n: any) => {
          setHoverNodeId(n ? String(n.id) : null);

          // Clear existing timeout
          if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            setHoverTimeout(null);
          }

          if (n) {
            // Set a timeout to show the modal after hovering for 500ms
            const timeout = setTimeout(() => {
              setHoveredNode(n);
              showInfoModal(n);
            }, 500);
            setHoverTimeout(timeout);
          } else {
            setHoveredNode(null);
          }
        })
        .onNodeClick((n: any) => {
          // Keep click functionality for camera movement
          const dist = 80;
          const pos = n.x && n.y && n.z ? { x: n.x, y: n.y, z: n.z } : { x: 0, y: 0, z: 0 };
          const length = Math.hypot(pos.x, pos.y, pos.z) || 1;
          const newPos = { x: pos.x * (1 + dist / length), y: pos.y * (1 + dist / length), z: pos.z * (1 + dist / length) };
          fg.cameraPosition(newPos, pos, 800);
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
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
        setHoverTimeout(null);
      }
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

      </div>

      {/* Container info centered at top */}
      <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 10000, fontSize: 12, background: 'rgba(255,255,255,0.85)', padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', color: '#111' }}>
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

  // Inject scoped styles for readability
  const style = document.createElement('style');
  style.textContent = `
    .modal-overlay { position:fixed; inset:0; background:rgba(2,6,23,0.72); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:9999; opacity:0; }
    .modal-content { background:#ffffff; color:#0b1220; border:1px solid #e5e7eb; border-radius:16px; padding:24px 28px; max-width:640px; width:92vw; max-height:80vh; overflow:auto; box-shadow:0 22px 45px -12px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.03); transform-origin:center center; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; line-height:1.6; font-size:16px; position:relative; }
    .modal-title { margin:0 0 8px 0; font-size:22px; font-weight:700; }
    .modal-sub { margin:0 0 12px 0; font-size:13px; color:#475569; }
    .modal-close { position:absolute; top:10px; right:10px; width:32px; height:32px; border-radius:9999px; border:1px solid #e5e7eb; background:#fff; color:#334155; font-size:18px; line-height:1; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.08); }
    .modal-close:hover { background:#f8fafc; }
    .kv { margin:6px 0; font-size:15px; }
    .kv strong { color:#0f172a; }
    .long { margin:12px 0; padding:12px; background:#f8fafc; border-left:3px solid #94a3b8; border-radius:8px; font-size:15px; }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const content = document.createElement('div');
  content.className = 'modal-content';

  // Close button
  const btn = document.createElement('button');
  btn.className = 'modal-close';
  btn.textContent = '×';
  btn.addEventListener('click', (e) => { e.stopPropagation(); close(); });

  content.innerHTML = renderNodeHtml(data);
  content.appendChild(btn);

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => { overlay.style.transition = 'opacity .3s ease'; overlay.style.opacity = '1'; });

  function close() {
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.remove(); style.remove(); }, 250);
  }
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); }, { once: true });
}

function renderNodeHtml(data: any) {
  if (!data) return '<h3>No data</h3>';
  const title = data.label || data.name || data.id || 'Node';
  const type = data.type ? `<div style="font-size:12px;color:#666;margin-bottom:8px">${data.type}</div>` : '';
  const shouldSkip = (k: string) => k.startsWith('__') || ['fx','fy','fz','vx','vy','vz','x','y','z','index','__indexColor'].includes(k);
  const kv = Object.entries(data)
    .filter(([k, v]) => !shouldSkip(k) && v !== null && v !== undefined)
    .map(([k, v]) => `<div style="margin:6px 0"><strong>${k}:</strong> ${typeof v === 'object' ? JSON.stringify(v) : v}</div>`)
    .join('');

  // Add download button for Person type nodes
  const downloadButton = data.type && data.type.toLowerCase() === 'person' ?
    `<div style="margin-top:16px;padding-top:16px;border-top:1px solid #e5e7eb;">
      <button
        onclick="downloadResume()"
        style="background:#22c55e;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,0.1);"
        onmouseover="this.style.background='#16a34a'"
        onmouseout="this.style.background='#22c55e'"
      >
        📄 Download Resume PDF
      </button>
    </div>` : '';

  return `<h3 style="margin:0 0 8px 0">${title}</h3>${type}${kv || '<div>No fields</div>'}${downloadButton}`;
}

// Global function for downloading resume
(window as any).downloadResume = function() {
  const link = document.createElement('a');
  link.href = '/Pedro Reichow - Resume.pdf';
  link.download = 'Pedro Reichow - Resume.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

