/** Toggleable filter pill. Fully inverts (ink) when active — no middle state. */
export interface FilterChipProps {
  active?: boolean;
  /** Optional result count shown in parentheses. */
  count?: number;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export declare function FilterChip(props: FilterChipProps): JSX.Element;
