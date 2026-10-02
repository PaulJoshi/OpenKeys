import type { IconName } from '../core/Icon';
/**
 * Pill CTA. Primary (ink) is the single main action per viewport; secondary (soft cloud) is the soft alternative;
 * onImage (white) anchors bottom-left of photography / campaign tiles.
 * @startingPoint section="Actions" subtitle="Pill buttons — primary, secondary, on-image" viewport="700x260"
 */
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'onImage';
  /** sm 14px · md 16px / 48px tall (default) · lg 24px campaign CTA */
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export declare function Button(props: ButtonProps): JSX.Element;
