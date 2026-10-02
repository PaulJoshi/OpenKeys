import React from 'react';
import { Icon } from '../core/Icon.jsx';

const VARIANTS = {
  soft:    { background: 'var(--ok-soft-cloud)', color: 'var(--ok-ink)' },
  ghost:   { background: 'transparent', color: 'var(--ok-ink)' },
  onImage: { background: 'var(--ok-white)', color: 'var(--ok-ink)' },
  inverse: { background: 'var(--ok-ink)', color: 'var(--ok-white)' },
};

export function IconButton({ icon, label, variant = 'soft', size = 40, iconSize, onClick, disabled = false, style, ...rest }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={disabled ? undefined : 'ok-press'}
      style={{ width: size, height: size, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: 0,
        borderRadius: 'var(--radius-full)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, ...(VARIANTS[variant] || VARIANTS.soft), ...style }} {...rest}>
      <Icon name={icon} size={iconSize || Math.round(size * 0.5)} />
    </button>
  );
}
