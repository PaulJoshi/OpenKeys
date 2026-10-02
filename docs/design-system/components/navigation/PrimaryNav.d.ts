/**
 * 56px white header: wordmark left, centered links (active = 2px ink underline, no fill), right cluster (search, icon buttons).
 * @startingPoint section="Navigation" subtitle="Utility bar + primary nav header" viewport="1200x120"
 */
export interface PrimaryNavProps {
  /** Wordmark text — no logo file exists; set in Inter Medium. */
  brand?: string;
  links?: { id?: string; label: string }[];
  /** id (or label) of the active link */
  active?: string;
  onNavigate?: (id: string) => void;
  /** Right cluster — typically <SearchPill/> + <IconButton variant="ghost"/>s. */
  right?: React.ReactNode;
  height?: number;
  style?: React.CSSProperties;
}
export declare function PrimaryNav(props: PrimaryNavProps): JSX.Element;
