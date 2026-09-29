// Every game talks to its channel only through this interface (CLAUDE.md rule 4). Channel adapters
// (devvit, fbinstant, portal, playables) implement it in later sessions; `web` and `mock` exist now.

/** A seed string: letters, digits, '-' and '_' only, 1–40 chars. Daily seeds look like `2026-09-29`. */
export type Seed = string;

export interface Challenge {
  seed: Seed;
  /** Score to beat, if the sender included one. */
  score?: number;
}

export interface ScoreEntry {
  score: number;
  seed: Seed;
  durationMs: number;
}

export type ShareKind = 'score' | 'challenge';

export interface SharePayload {
  kind: ShareKind;
  /** Short player-facing text (from strings.json). */
  text: string;
  seed: Seed;
  score: number;
  /** Optional PNG data URL of a result card (daily-puzzle template, M3). */
  image?: string;
}

export interface ShareResult {
  /** How the share was delivered. `none` = user cancelled or no share mechanism. */
  method: 'native' | 'clipboard' | 'platform' | 'mock' | 'none';
  payload: SharePayload;
  /** Link that reopens the game with the challenge seed, when the channel uses links. */
  url?: string;
}

export interface PlatformStorage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export type PlatformEvent = 'pause' | 'resume';

export interface PlatformAdapter {
  readonly name: string;
  /** Initialise the SDK. Call once, before anything else. */
  init(): Promise<void>;
  /** Loading progress 0–100 (clamped). */
  setLoadingProgress(pct: number): void;
  /** Loading finished; the game is about to show its first interactive frame. */
  start(): Promise<void>;
  /** Seed for the next run: the challenge seed if the session was opened from a challenge, else today's daily seed. */
  getSeed(): Promise<Seed>;
  /** The challenge this session was opened from, if any. */
  getChallenge(): Promise<Challenge | null>;
  submitScore(entry: ScoreEntry): Promise<void>;
  share(payload: SharePayload): Promise<ShareResult>;
  readonly storage: PlatformStorage;
  /** Subscribe to pause/resume. Returns an unsubscribe function. */
  on(event: PlatformEvent, cb: () => void): () => void;
}
