import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function SearchPill({ placeholder = 'Search', value, defaultValue, onChange, onSubmit, width = 180, autoFocus, style }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <form role="search" onSubmit={e => { e.preventDefault(); onSubmit && onSubmit(e.currentTarget.elements.q.value); }}
      style={{ display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box', height: 40, width, padding: focused ? '6px 14px' : '8px 16px',
        borderRadius: 'var(--radius-input)', background: focused ? 'var(--ok-white)' : 'var(--ok-soft-cloud)', border: focused ? '2px solid var(--ok-ink)' : 0,
        boxShadow: focused ? 'var(--focus-halo)' : 'none', transition: 'box-shadow var(--duration-base) var(--ease-standard)', ...style }}>
      <Icon name="search" size={20} />
      <input name="q" value={value} defaultValue={defaultValue} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', padding: 0, color: 'var(--ok-ink)',
          fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-size)', lineHeight: 'var(--type-body-lh)', fontWeight: 'var(--weight-regular)' }} />
    </form>
  );
}
