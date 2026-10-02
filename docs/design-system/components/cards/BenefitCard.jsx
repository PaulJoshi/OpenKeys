import React from 'react';
import { Button } from '../buttons/Button.jsx';

export function BenefitCard({ title, cta = 'Explore', onCta, image, background = 'var(--ok-ink)', height = 400, children, style }) {
  return (
    <div style={{ position: 'relative', height, background, overflow: 'hidden', borderRadius: 0, ...style }}>
      {image ? <img src={image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
      {children}
      <div style={{ position: 'absolute', left: 24, right: 24, bottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 18 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-medium)', fontSize: 'var(--type-heading-lg-size)', lineHeight: 'var(--type-heading-lg-lh)', color: 'var(--ok-white)', textWrap: 'pretty' }}>{title}</div>
        {cta ? <Button variant="onImage" onClick={onCta}>{cta}</Button> : null}
      </div>
    </div>
  );
}
