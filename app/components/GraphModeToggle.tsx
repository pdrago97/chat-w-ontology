import React from 'react';

interface Props {
  mode: '2d' | '3d';
  onChange: (m: '2d' | '3d') => void;
}

const GraphModeToggle: React.FC<Props> = ({ mode, onChange }) => {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const baseStyle: React.CSSProperties = {
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 600,
    border: '1px solid',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    outline: 'none',
  };

  const activeStyle: React.CSSProperties = {
    ...baseStyle,
    background: isDark ? '#2563eb' : '#0f172a',
    color: '#ffffff',
    borderColor: isDark ? '#2563eb' : '#0f172a',
  };

  const inactiveStyle: React.CSSProperties = {
    ...baseStyle,
    background: isDark ? 'rgba(31,41,55,0.9)' : 'rgba(255,255,255,0.9)',
    color: isDark ? '#e5e7eb' : '#0f172a',
    borderColor: isDark ? '#4b5563' : '#cbd5e1',
  };

  return (
    <div style={{ display: 'inline-flex', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }} role="group">
      <button
        type="button"
        onClick={() => onChange('2d')}
        style={{
          ...(mode === '2d' ? activeStyle : inactiveStyle),
          borderTopLeftRadius: 8,
          borderBottomLeftRadius: 8,
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
        }}
      >2D</button>
      <button
        type="button"
        onClick={() => onChange('3d')}
        style={{
          ...(mode === '3d' ? activeStyle : inactiveStyle),
          borderTopRightRadius: 8,
          borderBottomRightRadius: 8,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          borderLeft: 'none',
        }}
      >3D</button>
    </div>
  );
};

export default GraphModeToggle;
