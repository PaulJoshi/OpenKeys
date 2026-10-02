import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function CategoryIconCard({ icon, label, onClick, style }) {
  return (
    <button type="button" onClick={onClick} className="ok-press"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 8px', border: 0, borderRadius: 0, background: 'var(--ok-white)', color: 'var(--ok-ink)', cursor: 'pointer', minWidth: 0, ...style }}>
      <div style={{ width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={48} strokeWidth={1.5} /></div>
      <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-medium)', fontSize: 'var(--type-caption-md-size)', lineHeight: 'var(--type-caption-md-lh)' }}>{label}</span>
    </button>
  );
}
