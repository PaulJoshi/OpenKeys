/** Rounded (24px) search field. Soft cloud at rest; on focus turns white with 2px ink border and a 12px soft-cloud halo. */
export interface SearchPillProps {
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit?: (query: string) => void;
  /** CSS width, default 180 */
  width?: number | string;
  autoFocus?: boolean;
  style?: React.CSSProperties;
}
export declare function SearchPill(props: SearchPillProps): JSX.Element;
