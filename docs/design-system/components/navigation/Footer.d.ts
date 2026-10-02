/** Hairline-topped footer: N link columns (ink headers, mute 14px links), then a 9px legal row. */
export interface FooterProps {
  columns?: { title: string; links: string[] }[];
  legal?: string[];
  style?: React.CSSProperties;
}
export declare function Footer(props: FooterProps): JSX.Element;
