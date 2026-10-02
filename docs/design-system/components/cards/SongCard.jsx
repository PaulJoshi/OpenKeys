import React from 'react';
import { Badge } from '../badges/Badge.jsx';
import { SwatchDot } from '../badges/SwatchDot.jsx';

export function SongCard({ title, subtitle, meta, metaVariant, badge, swatches, image, media, aspectRatio = '1 / 1', onClick, style }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--ok-white)', borderRadius: 0, cursor: onClick ? 'pointer' : 'default', minWidth: 0, ...style }}>
      <div style={{ position: 'relative', aspectRatio, background: 'var(--ok-soft-cloud)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {image ? <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : media}
        {badge ? <div style={{ position: 'absolute', top: 12, left: 12 }}><Badge>{badge}</Badge></div> : null}
      </div>
      {swatches && swatches.length ? (
        <div style={{ display: 'flex', gap: 8, padding: '2px 2px 0' }}>{swatches.map((s, i) => <SwatchDot key={i} {...s} />)}</div>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--type-body-size)', lineHeight: 'var(--type-body-lh)', color: 'var(--ok-ink)' }}>{title}</div>
        {subtitle ? <div style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--type-caption-md-size)', lineHeight: 'var(--type-caption-md-lh)', color: 'var(--ok-mute)' }}>{subtitle}</div> : null}
      </div>
      {meta ? (metaVariant ? <Badge variant={metaVariant}>{meta}</Badge> :
        <div style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--type-body-size)', lineHeight: 'var(--type-body-lh)', color: 'var(--ok-ink)' }}>{meta}</div>) : null}
    </div>
  );
}
