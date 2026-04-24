import React from 'react';
export function Dialog({ open, children }) { return open ? <>{children}</> : null; }
export function DialogContent({ className = '', children }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><div className={className}>{children}</div></div>;
}
export function DialogHeader({ className = '', ...props }) { return <div className={className} {...props} />; }
export function DialogTitle({ className = '', ...props }) { return <div className={className} {...props} />; }
export function DialogDescription({ className = '', ...props }) { return <div className={className} {...props} />; }
export function DialogFooter({ className = '', ...props }) { return <div className={`mt-4 flex justify-end ${className}`} {...props} />; }
