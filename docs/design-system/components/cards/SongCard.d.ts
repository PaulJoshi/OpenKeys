/**
 * Song / lesson card (OpenKeys adaptation of the source "product-card").
 * Zero radius, zero shadow, zero internal padding. Media sits full-bleed on soft cloud; metadata stacks 8px apart below.
 * @startingPoint section="Content" subtitle="Song card — flat media on soft cloud + metadata" viewport="700x380"
 */
export interface SongCardProps {
  title: string;
  /** e.g. "Ludwig van Beethoven · Beginner" — mute caption */
  subtitle?: string;
  /** Bottom row (where retail shows price): duration, progress, "Completed"… */
  meta?: string;
  /** Renders meta as colored inline text instead of ink body-strong. */
  metaVariant?: 'success' | 'error' | 'muted';
  /** Promo pill top-left of media ("New", "Popular"). */
  badge?: string;
  /** Category / arrangement dots above the title. */
  swatches?: { color: string; active?: boolean; label?: string }[];
  /** Image URL (cover). */
  image?: string;
  /** Any node rendered inside the soft-cloud media area when no image (e.g. <PianoKeyboard/> preview). */
  media?: React.ReactNode;
  /** CSS aspect-ratio of media, default "1 / 1". */
  aspectRatio?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function SongCard(props: SongCardProps): JSX.Element;
