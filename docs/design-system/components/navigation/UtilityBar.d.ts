/** 36px soft-cloud strip above the primary nav; 12px medium links right-aligned. */
export interface UtilityBarProps {
  left?: React.ReactNode;
  links?: { label: string; href?: string; onClick?: (e: React.MouseEvent) => void }[];
  style?: React.CSSProperties;
}
export declare function UtilityBar(props: UtilityBarProps): JSX.Element;
