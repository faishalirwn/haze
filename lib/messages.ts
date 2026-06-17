import type { Effect, Reveal } from "./types";

/** Sent by the picker (content context) to the background when a rule is created. */
export interface CreateRuleMessage {
  type: "haze:create-rule";
  selector: string;
  effect: Effect;
  reveal: Reveal;
  intensity: number;
  grayscale: boolean;
}

export type HazeMessage = CreateRuleMessage;

export interface CreateRuleResponse {
  ok: boolean;
  error?: string;
}
