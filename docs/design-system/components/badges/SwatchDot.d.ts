/** 12px color dot. Active = concentric 2px white gap + 2px ink ring, no size change. */
export interface SwatchDotProps {
  /** Any CSS color; light colors get a 1px hairline ring automatically. */
  color?: string;
  active?: boolean;
  size?: number;
  label?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function SwatchDot(props: SwatchDotProps): JSX.Element;
