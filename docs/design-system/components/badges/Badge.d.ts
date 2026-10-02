/**
 * promo — white pill w/ hairline on top of imagery ("New", "Coming soon").
 * error / success / muted — container-less inline text (wrong notes, completion, metadata).
 */
export interface BadgeProps {
  variant?: 'promo' | 'error' | 'success' | 'muted';
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export declare function Badge(props: BadgeProps): JSX.Element;
