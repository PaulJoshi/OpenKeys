import type { IconName } from '../core/Icon';
/** 40px circular icon control — back, carousel paddles, favorite, share, play. */
export interface IconButtonProps {
  icon: IconName;
  /** Accessible label (also the tooltip). */
  label: string;
  variant?: 'soft' | 'ghost' | 'onImage' | 'inverse';
  /** Diameter px, default 40. */
  size?: number;
  iconSize?: number;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
