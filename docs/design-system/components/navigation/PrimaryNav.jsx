import React from 'react';

export function PrimaryNav({ brand = 'OpenKeys', links = [], active, onNavigate, right, height = 56, style }) {
  return (
    <header style={{ height, background: 'var(--ok-white)', color: 'var(--ok-ink)', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 24, padding: '0 var(--gutter-desktop)', boxSizing: 'border-box', ...style }}>
      <a href="#" onClick={e => { e.preventDefault(); onNavigate && onNavigate('home'); }}
        style={{ justifySelf: 'start', color: 'var(--ok-ink)', textDecoration: 'none', fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-medium)', fontSize: 20, lineHeight: 1, letterSpacing: '-0.01em' }}>{brand}</a>
      <nav style={{ display: 'flex', alignItems: 'stretch', gap: 24, height: '100%' }}>
        {links.map(l => {
          const id = l.id || l.label; const on = id === active;
          return (
            <a key={id} href="#" onClick={e => { e.preventDefault(); onNavigate && onNavigate(id); }}
              style={{ display: 'flex', alignItems: 'center', color: 'var(--ok-ink)', textDecoration: 'none', fontWeight: 'var(--weight-medium)', fontSize: 'var(--type-body-size)', lineHeight: 'var(--type-body-lh)',
                boxShadow: on ? 'inset 0 -2px 0 var(--ok-ink)' : 'none', whiteSpace: 'nowrap' }}>{l.label}</a>
          );
        })}
      </nav>
      <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>
    </header>
  );
}
