import React from 'react';

export function Badge({ variant = 'promo', children, style }) {
  if (variant === 'promo') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 'var(--radius-button)', background: 'var(--ok-white)',
        border: '1px solid var(--ok-hairline)', color: 'var(--ok-ink)', fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-medium)',
        fontSize: 'var(--type-caption-sm-size)', lineHeight: 'var(--type-caption-sm-lh)', whiteSpace: 'nowrap', ...style }}>{children}</span>
    );
  }
  const color = variant === 'error' ? 'var(--ok-red)' : variant === 'success' ? 'var(--ok-green)' : 'var(--ok-mute)';
  return (
    <span style={{ color, fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-medium)', fontSize: 'var(--type-caption-md-size)', lineHeight: 'var(--type-caption-md-lh)', ...style }}>{children}</span>
  );
}
