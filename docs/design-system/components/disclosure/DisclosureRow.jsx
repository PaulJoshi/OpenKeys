import React from 'react';
import { Icon } from '../core/Icon.jsx';

export function DisclosureRow({ title, variant = 'detail', defaultOpen = false, open, onToggle, children, style }) {
  const [inner, setInner] = React.useState(defaultOpen);
  const isOpen = open != null ? open : inner;
  const toggle = () => { if (open == null) setInner(!isOpen); onToggle && onToggle(!isOpen); };
  const faq = variant === 'faq';
  return (
    <div style={{ borderBottom: '1px solid var(--ok-hairline)', ...style }}>
      <button type="button" aria-expanded={isOpen} onClick={toggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '24px 0', border: 0, background: 'transparent', color: 'var(--ok-ink)', cursor: 'pointer', textAlign: 'left',
          fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-medium)', fontSize: 16, lineHeight: faq ? 'var(--type-heading-md-lh)' : 'var(--type-body-lh)' }}>
        <span>{title}</span>
        <Icon name="chevron-down" size={24} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--duration-base) var(--ease-standard)' }} />
      </button>
      {isOpen ? <div style={{ paddingBottom: 24, fontSize: 'var(--type-body-size)', lineHeight: 'var(--type-body-lh)', color: 'var(--ok-ink)' }}>{children}</div> : null}
    </div>
  );
}
