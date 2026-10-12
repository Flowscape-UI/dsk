import type { EyeDropperSampler } from './eyedropper-source.ts';

/** Built-in mode names or a name registered on an individual eyedropper. */
export type EyeDropperMode = string;

export interface EyeDropperModeContext {
  host: HTMLElement;
  document: Document;
  /** Aborted on cancellation, failure, or successful completion. */
  signal: AbortSignal;
  source: HTMLCanvasElement | null;
}

export interface EyeDropperSession {
  sample: EyeDropperSampler;
  /** Release session resources; called once, including for a late session. */
  dispose?: () => void;
  /** Optional frozen viewport canvas. Omit to keep the page interactive. */
  surface?: HTMLCanvasElement;
}

export interface EyeDropperModeAdapter {
  label?: string;
  /** A synchronous capability check without allocating session resources. */
  isSupported?: (context: EyeDropperModeContext) => boolean;
  createSession: (
    context: EyeDropperModeContext,
  ) => EyeDropperSession | Promise<EyeDropperSession>;
}

export interface EyeDropperModeInfo {
  readonly id: EyeDropperMode;
  readonly label: string;
  readonly supported: boolean;
}
