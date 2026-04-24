import React from 'react';
export function Badge({ className = '', ...props }) {
  return <span className={`inline-flex items-center ${className}`} {...props} />;
}
