/** Accordion row: 24px vertical padding, 1px hairline below, chevron right. 'detail' (body-strong) or 'faq' (heading-md). */
export interface DisclosureRowProps {
  title: string;
  variant?: 'detail' | 'faq';
  defaultOpen?: boolean;
  /** Controlled open state. */
  open?: boolean;
  onToggle?: (open: boolean) => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function DisclosureRow(props: DisclosureRowProps): JSX.Element;
