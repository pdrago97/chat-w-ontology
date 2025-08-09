import React from 'react';

interface Props {
  mode: '2d' | '3d';
  onChange: (m: '2d' | '3d') => void;
}

const GraphModeToggle: React.FC<Props> = ({ mode, onChange }) => {
  return (
    <div className="inline-flex rounded-md shadow-sm" role="group">
      <button
        type="button"
        onClick={() => onChange('2d')}
        className={`px-3 py-2 text-sm font-semibold border ${mode === '2d' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} border-slate-300 rounded-l-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/50`}
      >2D</button>
      <button
        type="button"
        onClick={() => onChange('3d')}
        className={`px-3 py-2 text-sm font-semibold border ${mode === '3d' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} border-slate-300 rounded-r-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900/50`}
      >3D</button>
    </div>
  );
};

export default GraphModeToggle;

