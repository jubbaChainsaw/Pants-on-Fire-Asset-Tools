import React from 'react';
export function Label({ className = '', ...props }) {
  return <label className={`block text-sm ${className}`} {...props} />;
}
