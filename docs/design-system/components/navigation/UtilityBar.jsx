import React from 'react';

export function UtilityBar({ left, links = [], style }) {
  return (
    <div style={{ height: 'var(--nav-utility-h)', background: 'var(--ok-soft-cloud)', color: 'var(--ok-ink)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--gutter-desktop)',
      fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-medium)', fontSize: 'var(--type-caption-sm-size)', lineHeight: 'var(--type-caption-sm-lh)', ...style }}>
      <div>{left}</div>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {links.map((l, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <span aria-hidden="true" style={{ width: 1, height: 12, background: 'var(--ok-ink)' }} /> : null}
            <a href={l.href || '#'} onClick={l.onClick} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 'inherit' }}>{l.label}</a>
          </React.Fragment>
        ))}
      </nav>
    </div>
  );
}
