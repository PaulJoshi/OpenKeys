/** Dark photographic card: 24px white heading bottom-left + white "Explore" pill. Source: "member-benefit-card". */
export interface BenefitCardProps {
  title: string;
  /** Default "Explore"; pass empty string to hide. */
  cta?: string;
  onCta?: () => void;
  image?: string;
  background?: string;
  height?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function BenefitCard(props: BenefitCardProps): JSX.Element;
