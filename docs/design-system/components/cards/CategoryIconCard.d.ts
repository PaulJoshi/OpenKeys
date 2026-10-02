import type { IconName } from '../core/Icon';
/** Centered ~80px icon with a caption label below, on canvas. Used in 4–8-up category strips. */
export interface CategoryIconCardProps {
  icon: IconName;
  label: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function CategoryIconCard(props: CategoryIconCardProps): JSX.Element;
