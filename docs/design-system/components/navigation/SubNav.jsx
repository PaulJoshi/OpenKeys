import React from 'react';
import { Icon } from '../core/Icon.jsx';

const ctl = { display: 'inline-flex', alignItems: 'center', gap: 8, border: 0, background: 'transparent', padding: 0, cursor: 'pointer', color: 'var(--ok-ink)',
  fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-medium)', fontSize: 'var(--type-button-md-size)', lineHeight: 'var(--type-button-md-lh)' };

export function SubNav({ breadcrumb = [], title, filtersHidden = false, onToggleFilters, sortLabel = 'Featured', onSort, style }) {
  return (
    <div style={{ background: 'var(--ok-white)', boxShadow: 'var(--elevation-inset)', padding: '12px var(--gutter-desktop) 18px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, ...style }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {breadcrumb.length ? <div style={{ fontSize: 'var(--type-caption-md-size)', lineHeight: 'var(--type-caption-md-lh)', fontWeight: 'var(--weight-medium)', color: 'var(--ok-mute)' }}>{breadcrumb.join(' / ')}</div> : null}
        {title ? <div style={{ fontSize: 'var(--type-heading-lg-size)', lineHeight: 'var(--type-heading-lg-lh)', fontWeight: 'var(--weight-medium)' }}>{title}</div> : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {onToggleFilters ? <button type="button" style={ctl} onClick={onToggleFilters}>{filtersHidden ? 'Show Filters' : 'Hide Filters'}<Icon name="sliders-horizontal" size={20} /></button> : null}
        <button type="button" style={ctl} onClick={onSort}>Sort By: {sortLabel}<Icon name="chevron-down" size={20} /></button>
      </div>
    </div>
  );
}
