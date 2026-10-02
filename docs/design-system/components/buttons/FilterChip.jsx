import React from 'react';

export function FilterChip({ active = false, count, children, onClick, style, ...rest }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className="ok-press"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, boxSizing: 'border-box', height: 40, padding: '8px 16px', borderRadius: 'var(--radius-button)',
        border: '1px solid ' + (active ? 'var(--ok-ink)' : 'var(--ok-hairline)'), background: active ? 'var(--ok-ink)' : 'var(--ok-white)', color: active ? 'var(--ok-white)' : 'var(--ok-ink)',
        fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-medium)', fontSize: 'var(--type-button-md-size)', lineHeight: 'var(--type-button-md-lh)', whiteSpace: 'nowrap', cursor: 'pointer', ...style }} {...rest}>
      {children}
      {count != null ? <span style={{ color: active ? 'var(--ok-stone)' : 'var(--ok-mute)' }}>({count})</span> : null}
    </button>
  );
}
