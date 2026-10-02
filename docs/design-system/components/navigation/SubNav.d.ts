/** Listing sub-header: mute breadcrumb + 24px title left; Hide Filters + Sort By right; inset hairline-soft bottom edge. */
export interface SubNavProps {
  breadcrumb?: string[];
  title?: string;
  filtersHidden?: boolean;
  /** Omit to hide the filter toggle. */
  onToggleFilters?: () => void;
  sortLabel?: string;
  onSort?: () => void;
  style?: React.CSSProperties;
}
export declare function SubNav(props: SubNavProps): JSX.Element;
