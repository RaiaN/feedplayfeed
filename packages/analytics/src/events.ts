// Typed analytics events (CLAUDE.md "Analytics events"). No personal data: no user IDs, names or free text
// except error messages from our own code.

export interface EventMap {
  session_start: Record<string, never>;
  first_input: { ms: number };
  round_start: { seed: string };
  round_end: { score: number; duration_ms: number; seed: string };
  share_click: Record<string, never>;
  challenge_open: { seed: string };
  error: { message: string };
}

export type EventName = keyof EventMap;

export type AnalyticsEvent = {
  [K in EventName]: { name: K; props: EventMap[K]; /** ms since session_start */ t: number };
}[EventName];

export type Sink = (event: AnalyticsEvent) => void;

export interface Analytics {
  track<K extends EventName>(name: K, ...props: EventMap[K] extends Record<string, never> ? [] : [EventMap[K]]): void;
  /** Emits first_input{ms} once per session; later calls are ignored. */
  firstInput(): void;
}

export interface AnalyticsOptions {
  sinks: Sink[];
  now: () => number;
}

/** Creates the tracker and emits session_start immediately. */
export function createAnalytics({ sinks, now }: AnalyticsOptions): Analytics {
  const t0 = now();
  let firstInputSent = false;
  const emit = (event: AnalyticsEvent): void => {
    for (const sink of sinks) {
      try {
        sink(event);
      } catch {
        // A broken sink must never break the game.
      }
    }
  };
  const analytics: Analytics = {
    track(name, ...props) {
      emit({ name, props: props[0] ?? {}, t: Math.round(now() - t0) } as AnalyticsEvent);
    },
    firstInput() {
      if (firstInputSent) return;
      firstInputSent = true;
      analytics.track('first_input', { ms: Math.round(now() - t0) });
    },
  };
  analytics.track('session_start');
  return analytics;
}

export function consoleSink(log: (...args: unknown[]) => void = console.info): Sink {
  return (e) => log('[analytics]', e.name, e.props);
}

export interface MemorySink {
  sink: Sink;
  readonly events: AnalyticsEvent[];
  named<K extends EventName>(name: K): Array<Extract<AnalyticsEvent, { name: K }>>;
}

export function memorySink(): MemorySink {
  const events: AnalyticsEvent[] = [];
  return {
    sink: (e) => void events.push(e),
    events,
    named: <K extends EventName>(name: K) =>
      events.filter((e): e is Extract<AnalyticsEvent, { name: K }> => e.name === name),
  };
}
