import React from 'react';

export function FilterSidebar({ groups = [], onToggle, width = 220, style }) {
  return (
    <aside style={{ width, flex: 'none', background: 'var(--ok-white)', display: 'flex', flexDirection: 'column', ...style }}>
      {groups.map((g, gi) => (
        <div key={g.title} style={{ borderTop: gi ? '1px solid var(--ok-hairline)' : 0, padding: '18px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--type-body-size)', lineHeight: 'var(--type-body-lh)' }}>{g.title}</div>
          {g.options.map(o => (
            <button key={o.label} type="button" onClick={() => onToggle && onToggle(g.title, o.label)}
              style={{ alignSelf: 'flex-start', border: 0, background: 'transparent', padding: 0, cursor: 'pointer', color: 'var(--ok-ink)', textAlign: 'left',
                fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-medium)', fontSize: 'var(--type-body-size)', lineHeight: 'var(--type-body-lh)',
                textDecoration: o.active ? 'underline' : 'none', textDecorationThickness: 1, textUnderlineOffset: 4 }}>
              {o.label}{o.count != null ? <span style={{ color: 'var(--ok-mute)' }}> ({o.count})</span> : null}
            </button>
          ))}
        </div>
      ))}
    </aside>
  );
}
