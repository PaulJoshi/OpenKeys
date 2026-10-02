import React from 'react';

const LIGHT = /^(#fff|#ffffff|white|#f5f5f5|var\(--ok-white\)|var\(--ok-soft-cloud\))$/i;

export function SwatchDot({ color = 'var(--ok-ink)', active = false, size = 12, label, onClick, style }) {
  const ring = active ? '0 0 0 2px var(--ok-white), 0 0 0 4px var(--ok-ink)' : LIGHT.test(color) ? '0 0 0 1px var(--ok-hairline)' : 'none';
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag type={onClick ? 'button' : undefined} aria-label={label} title={label} aria-pressed={onClick ? active : undefined} onClick={onClick}
      style={{ display: 'inline-block', width: size, height: size, padding: 0, border: 0, flex: 'none', borderRadius: 'var(--radius-full)', background: color, boxShadow: ring, cursor: onClick ? 'pointer' : 'default', ...style }} />
  );
}
