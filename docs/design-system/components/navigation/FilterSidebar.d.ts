/** 220px left rail of filter groups; 1px hairline between groups, active options underlined, counts in mute. */
export interface FilterSidebarProps {
  groups: { title: string; options: { label: string; count?: number; active?: boolean }[] }[];
  onToggle?: (group: string, option: string) => void;
  width?: number;
  style?: React.CSSProperties;
}
export declare function FilterSidebar(props: FilterSidebarProps): JSX.Element;
