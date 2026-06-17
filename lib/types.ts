// Core data model for Haze. See docs/DESIGN.md §4.3.

export type Effect = "blur" | "scratchcard" | "both";
export type Reveal = "hover" | "click";

/** A single user-defined (or materialized community) rule. */
export interface Rule {
  id: string;
  /** CSS selector. May be a comma-separated group; the engine splits it. */
  selector: string;
  effect: Effect;
  /** Blur radius in px. */
  intensity: number;
  /** Also desaturate — useful for color-coded indicators. */
  grayscale: boolean;
  reveal: Reveal;
  /** Scratchcard overlay color; falls back to the site/global default. */
  bg?: string;
  enabled: boolean;
}

export const DEFAULT_INTENSITY = 8;
export const DEFAULT_EFFECT: Effect = "blur";
export const DEFAULT_REVEAL: Reveal = "hover";
/** Neutral mid-gray scratchcard background when a site sets none. */
export const DEFAULT_BG = "#888";
