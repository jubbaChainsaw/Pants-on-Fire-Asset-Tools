import React from 'react';
export function Button({ className = '', variant = 'default', size, ...props }) {
  const base = 'inline-flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed';
  return <button className={`${base} ${className}`} {...props} />;
}
