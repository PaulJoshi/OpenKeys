export type IconName = 'search'|'heart'|'chevron-down'|'chevron-right'|'chevron-left'|'chevron-up'|'arrow-left'|'arrow-right'|'play'|'pause'|'menu'|'x'|'check'|'sliders-horizontal'|'music'|'piano'|'github'|'share-2'|'user'|'house'|'library'|'trophy'|'flame'|'clock'|'volume-2'|'settings'|'rotate-ccw'|'timer'|'list-music'|'book-open'|'star'|'plus'|'minus'|'circle-check'|'download'|'globe'|'hand'|'keyboard'|'skip-back'|'skip-forward'|'repeat'|'chart-no-axes-column'|'headphones'|'award'|'code'|'shopping-bag'|'sparkles'|'gauge'|'eye'|'graduation-cap';
/** Lucide line icon (2px stroke, 24px grid). Intentional addition: the source defines no icon set. */
export interface IconProps {
  name: IconName;
  /** px, default 24 */
  size?: number;
  strokeWidth?: number;
  color?: string;
  style?: React.CSSProperties;
}
export declare const ICON_NAMES: IconName[];
export declare function Icon(props: IconProps): JSX.Element | null;
