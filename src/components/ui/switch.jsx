import React from 'react';
export function Switch({ checked = false, onCheckedChange }) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange?.(!checked)}
      className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-yellow-300' : 'bg-white/20'}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  );
}
