/**
 * Signature editorial unit: full-bleed image with Bebas Neue display headline burned in bottom-left and one white pill CTA.
 * @startingPoint section="Content" subtitle="Full-bleed campaign hero with display headline" viewport="700x420"
 */
export interface CampaignTileProps {
  /** Use "\n" for line breaks. Rendered uppercase. */
  headline: string;
  /** Headline color: 'light' (white, default) or 'dark' (ink) — pick whichever reads on the image. */
  tone?: 'light' | 'dark';
  image?: string;
  /** Fallback fill when no image. Default ink. */
  background?: string;
  cta?: string;
  onCta?: () => void;
  /** px, default 520 */
  height?: number;
  /** Display px — 96 desktop, 64 tablet, 48 mobile. */
  displaySize?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function CampaignTile(props: CampaignTileProps): JSX.Element;
