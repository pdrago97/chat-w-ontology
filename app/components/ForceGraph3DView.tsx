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
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [counts, setCounts] = useState<{ nodes: number; links: number }>({ nodes: 0, links: 0 });
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
        if (['fx', 'fy', 'fz', 'vx', 'vy', 'vz', 'x', 'y', 'z', 'index'].includes(k)) continue;
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
          if (['fx', 'fy', 'fz', 'vx', 'vy', 'vz', 'x', 'y', 'z', 'index', '__indexColor'].includes(k)) continue;
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
        .nodeLabel(() => '') // Disable default tooltip, we'll use custom HTML tooltip
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
        .linkThreeObjectExtend(true)
        .linkThreeObject((link: any) => {
          // Create a text sprite for the link label
          const label = link.relation || link.label || '';
          if (!label) return null;

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          const fontSize = 28;
          context.font = `${fontSize}px Arial, sans-serif`;

          // Measure text and set canvas size
          const metrics = context.measureText(label);
          canvas.width = Math.max(metrics.width + 10, 50);
          canvas.height = fontSize + 10;

          // Redraw text after canvas resize
          context.font = `${fontSize}px Arial, sans-serif`;
          context.fillStyle = 'rgba(100, 116, 139, 0.9)'; // slate-500 with opacity
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText(label, canvas.width / 2, canvas.height / 2);

          const texture = new THREE.CanvasTexture(canvas);
          const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false
          });
          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.scale.set(canvas.width / 8, canvas.height / 8, 1);

          return sprite;
        })
        .linkPositionUpdate((sprite: any, { start, end }: any) => {
          // Position label at the midpoint of the link
          if (sprite) {
            const middlePos = {
              x: start.x + (end.x - start.x) / 2,
              y: start.y + (end.y - start.y) / 2,
              z: start.z + (end.z - start.z) / 2
            };
            Object.assign(sprite.position, middlePos);
          }
        })
        .backgroundColor('#f8fafc') // slate-50
        .onNodeHover((n: any, prevNode: any) => {
          setHoverNodeId(n ? String(n.id) : null);

          // Clear existing timeout
          if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            setHoverTimeout(null);
          }

          // Remove existing tooltip
          const existingTooltip = document.querySelector('.custom-node-tooltip');
          if (existingTooltip) {
            existingTooltip.remove();
          }

          // Only update hover state, don't show modal on hover
          if (n) {
            setHoveredNode(n);
            // Show custom HTML tooltip
            showCustomTooltip(n);
          } else {
            setHoveredNode(null);
          }
        })
        .onNodeClick((n: any) => {
          // Show modal on click
          if (n) {
            showInfoModal(n);
          }

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

// Create rich tooltip content for hover
function createRichTooltip(node: any): string {
  if (!node) return 'Unknown Node';

  const title = node.label || node.name || node.id || 'Unknown';
  const type = node.type || '';

  // Build tooltip lines based on node type and available data
  const lines = [title];

  // Add type if available
  if (type && type !== 'Unknown') {
    lines.push(`[${type}]`);
  }

  // Add type-specific information
  switch (type) {
    case 'Person':
      if (node.title) lines.push(node.title);
      if (node.location) lines.push(node.location);
      break;

    case 'Experience':
      if (node.title) lines.push(node.title);
      if (node.years) lines.push(node.years);
      if (node.location) lines.push(node.location);
      break;

    case 'Education':
      if (node.degree) lines.push(node.degree);
      if (node.years) lines.push(node.years);
      if (node.location) lines.push(node.location);
      break;

    case 'Skills':
      if (node.category) lines.push(`Category: ${node.category}`);
      if (node.proficiency) lines.push(`Level: ${node.proficiency}`);
      if (node.items && Array.isArray(node.items)) {
        lines.push(`Skills: ${node.items.slice(0, 3).join(', ')}${node.items.length > 3 ? '...' : ''}`);
      }
      break;

    case 'Project':
      if (node.company) lines.push(`at ${node.company}`);
      if (node.year) lines.push(node.year);
      if (node.technologies && Array.isArray(node.technologies)) {
        lines.push(`Tech: ${node.technologies.slice(0, 2).join(', ')}${node.technologies.length > 2 ? '...' : ''}`);
      }
      break;

    default:
      // For other types, show common fields
      if (node.description && node.description.length < 60) {
        lines.push(node.description);
      }
      if (node.summary && node.summary.length < 60) {
        lines.push(node.summary);
      }
      if (node.years) lines.push(node.years);
      if (node.location) lines.push(node.location);
      break;
  }

  // Limit to 4 lines to avoid overcrowding
  return lines.slice(0, 4);
}

// Show custom HTML tooltip with ALL node data
function showCustomTooltip(node: any) {
  // Remove any existing tooltip
  const existingTooltip = document.querySelector('.custom-node-tooltip');
  if (existingTooltip) {
    existingTooltip.remove();
  }

  // Create tooltip element
  const tooltip = document.createElement('div');
  tooltip.className = 'custom-node-tooltip';

  // Create comprehensive HTML content showing all data
  const title = node.label || node.name || node.id || 'Unknown';
  const type = node.type || '';

  // Helper function to format field names
  const formatFieldName = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ');
  };

  // Helper function to format values
  const formatValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  // Fields to skip (internal/positioning data)
  const skipFields = new Set([
    'id', 'label', 'name', 'type', 'x', 'y', 'z', 'vx', 'vy', 'vz',
    'fx', 'fy', 'fz', 'index', '__indexColor', '__threeObj', '__lineObj',
    '_degree'
  ]);

  // Get all available fields
  const allFields = Object.entries(node)
    .filter(([key, value]) => !skipFields.has(key) && value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      key,
      value,
      formatted: formatValue(value)
    }));

  // Build HTML content
  let content = `
    <div class="tooltip-header">
      <div class="tooltip-title">${title}</div>
      ${type ? `<div class="tooltip-subtitle">[${type}]</div>` : ''}
    </div>
  `;

  if (allFields.length > 0) {
    content += `<div class="tooltip-details">`;

    allFields.forEach(({ key, value, formatted }) => {
      const fieldName = formatFieldName(key);

      // Handle long text fields differently
      if (typeof value === 'string' && value.length > 100) {
        content += `
          <div class="tooltip-field">
            <div class="tooltip-field-name">${fieldName}:</div>
            <div class="tooltip-field-value tooltip-long-text">${formatted}</div>
          </div>
        `;
      } else if (Array.isArray(value) && value.length > 3) {
        // Handle long arrays
        content += `
          <div class="tooltip-field">
            <div class="tooltip-field-name">${fieldName}:</div>
            <div class="tooltip-field-value tooltip-array">${formatted}</div>
          </div>
        `;
      } else {
        content += `
          <div class="tooltip-field">
            <span class="tooltip-field-name">${fieldName}:</span>
            <span class="tooltip-field-value">${formatted}</span>
          </div>
        `;
      }
    });

    content += `</div>`;
  }

  tooltip.innerHTML = content;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .custom-node-tooltip {
      position: fixed;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(0, 0, 0, 0.1);
      border-radius: 12px;
      padding: 12px 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      color: #1f2937;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      max-width: 350px;
      max-height: 400px;
      overflow-y: auto;
      pointer-events: none;
      transform: translateY(-100%) translateY(-8px);
    }

    .tooltip-header {
      margin-bottom: 10px;
    }

    .tooltip-title {
      font-weight: 600;
      font-size: 14px;
      color: #111827;
      margin-bottom: 2px;
      word-wrap: break-word;
    }

    .tooltip-subtitle {
      font-size: 11px;
      color: #6b7280;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .tooltip-details {
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      padding-top: 10px;
    }

    .tooltip-field {
      margin-bottom: 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .tooltip-field:last-child {
      margin-bottom: 0;
    }

    .tooltip-field-name {
      font-weight: 500;
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .tooltip-field-value {
      color: #374151;
      font-size: 12px;
      word-wrap: break-word;
      line-height: 1.3;
    }

    .tooltip-long-text {
      max-height: 60px;
      overflow-y: auto;
      padding: 4px 8px;
      background: rgba(0, 0, 0, 0.02);
      border-radius: 4px;
      font-size: 11px;
      line-height: 1.4;
    }

    .tooltip-array {
      font-size: 11px;
      line-height: 1.4;
    }

    /* Custom scrollbar for tooltip */
    .custom-node-tooltip::-webkit-scrollbar,
    .tooltip-long-text::-webkit-scrollbar {
      width: 4px;
    }

    .custom-node-tooltip::-webkit-scrollbar-track,
    .tooltip-long-text::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.05);
      border-radius: 2px;
    }

    .custom-node-tooltip::-webkit-scrollbar-thumb,
    .tooltip-long-text::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 2px;
    }

    .custom-node-tooltip::-webkit-scrollbar-thumb:hover,
    .tooltip-long-text::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 0, 0, 0.3);
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(tooltip);

  // Position tooltip near mouse cursor
  const updateTooltipPosition = (e: MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;

    // Position tooltip above and slightly to the right of cursor
    tooltip.style.left = `${x + 10}px`;
    tooltip.style.top = `${y - 10}px`;
  };

  // Add mouse move listener to update position
  const mouseMoveHandler = (e: MouseEvent) => updateTooltipPosition(e);
  document.addEventListener('mousemove', mouseMoveHandler);

  // Add click listener to remove tooltip when clicking anywhere
  const clickHandler = (e: MouseEvent) => {
    // Remove tooltip on any click to avoid interfering with UI
    tooltip.remove();
  };
  document.addEventListener('click', clickHandler, { once: true });

  // Clean up on tooltip removal
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.removedNodes.forEach((node) => {
        if (node === tooltip) {
          document.removeEventListener('mousemove', mouseMoveHandler);
          document.removeEventListener('click', clickHandler);
          style.remove();
          observer.disconnect();
        }
      });
    });
  });
  observer.observe(document.body, { childList: true });

  // Set initial position (use current mouse position if available)
  const rect = document.body.getBoundingClientRect();
  tooltip.style.left = `${rect.width / 2}px`;
  tooltip.style.top = `${rect.height / 2}px`;
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
  const shouldSkip = (k: string) => k.startsWith('__') || ['fx', 'fy', 'fz', 'vx', 'vy', 'vz', 'x', 'y', 'z', 'index', '__indexColor'].includes(k);
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
(window as any).downloadResume = function () {
  const link = document.createElement('a');
  link.href = '/Pedro Reichow - Resume.pdf';
  link.download = 'Pedro Reichow - Resume.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

