import React from 'react';
import { Icon } from '../core/Icon.jsx';

const SIZES = {
  sm: { padding: '8px 16px', fontSize: 'var(--type-button-sm-size)', lineHeight: 'var(--type-button-sm-lh)', icon: 16 },
  md: { padding: '12px 32px', fontSize: 'var(--type-button-md-size)', lineHeight: 'var(--type-button-md-lh)', icon: 20, height: 48 },
  lg: { padding: '16px 32px', fontSize: 'var(--type-button-lg-size)', lineHeight: 'var(--type-button-lg-lh)', icon: 24 },
};
const VARIANTS = {
  primary:   { background: 'var(--ok-ink)', color: 'var(--ok-white)' },
  secondary: { background: 'var(--ok-soft-cloud)', color: 'var(--ok-ink)' },
  onImage:   { background: 'var(--ok-white)', color: 'var(--ok-ink)' },
};

export function Button({ variant = 'primary', size = 'md', icon, iconRight, fullWidth = false, disabled = false, children, onClick, type = 'button', style, ...rest }) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const pad = variant === 'onImage' && size === 'md' ? '12px 24px' : s.padding;
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={disabled ? undefined : 'ok-press'}
      style={{
        display: fullWidth ? 'flex' : 'inline-flex', width: fullWidth ? '100%' : undefined, alignItems: 'center', justifyContent: 'center', gap: 8,
        boxSizing: 'border-box', height: s.height, padding: pad, border: 0, borderRadius: 'var(--radius-button)',
        fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-medium)', fontSize: s.fontSize, lineHeight: s.lineHeight, whiteSpace: 'nowrap',
        cursor: disabled ? 'not-allowed' : 'pointer', ...v,
        ...(disabled ? { background: 'var(--ok-hairline-soft)', color: 'var(--ok-stone)' } : null), ...style,
      }} {...rest}>
      {icon ? <Icon name={icon} size={s.icon} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={s.icon} /> : null}
    </button>
  );
}
