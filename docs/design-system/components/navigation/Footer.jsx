import React from 'react';

export function Footer({ columns = [], legal = [], style }) {
  return (
    <footer style={{ background: 'var(--ok-white)', borderTop: '1px solid var(--ok-hairline)', padding: '48px var(--gutter-desktop) 24px', color: 'var(--ok-mute)', ...style }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + Math.max(columns.length, 1) + ', minmax(0, 1fr))', gap: 24 }}>
        {columns.map(c => (
          <div key={c.title} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--type-body-size)', lineHeight: 'var(--type-body-lh)', color: 'var(--ok-ink)' }}>{c.title}</div>
            {c.links.map(l => <a key={l} href="#" style={{ color: 'var(--ok-mute)', textDecoration: 'none', fontWeight: 'var(--weight-medium)', fontSize: 'var(--type-caption-md-size)', lineHeight: 'var(--type-caption-md-lh)' }}>{l}</a>)}
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid var(--ok-hairline)', marginTop: 48, paddingTop: 12, display: 'flex', flexWrap: 'wrap', gap: 18,
        fontWeight: 'var(--weight-medium)', fontSize: 'var(--type-utility-size)', lineHeight: 'var(--type-utility-lh)', color: 'var(--ok-mute)' }}>
        {legal.map(l => <span key={l}>{l}</span>)}
      </div>
    </footer>
  );
}
