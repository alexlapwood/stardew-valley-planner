import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
} from "solid-js";

import {
  changesBetween,
  earliestChange,
  noChange,
  type TNextChange,
} from "./mapFrames";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

// motionTime stays at 0 when the device asks for reduced motion, and time
// goes on, for the animations that play also then. now is the time of the
// clock between 2 ticks.
export interface IMapClock {
  motionTime: Accessor<number>;
  now: () => number;
  time: Accessor<number>;
}

function createDocumentHidden() {
  const [hidden, setHidden] = createSignal(document.hidden);

  const onVisibilityChange = () => {
    setHidden(document.hidden);
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  onCleanup(() => {
    document.removeEventListener("visibilitychange", onVisibilityChange);
  });

  return hidden;
}

function createReducedMotion(): Accessor<boolean> {
  // jsdom has no matchMedia.
  if ((window as Partial<Window>).matchMedia === undefined) {
    return () => false;
  }

  const query = window.matchMedia(reducedMotionQuery);
  const [reduced, setReduced] = createSignal(query.matches);

  const onChange = (event: MediaQueryListEvent) => {
    setReduced(event.matches);
  };

  query.addEventListener("change", onChange);
  onCleanup(() => {
    query.removeEventListener("change", onChange);
  });

  return reduced;
}

// alwaysNextChange gives the frames that play also when the device asks for
// reduced motion.
export function createMapClock(
  nextChange: Accessor<TNextChange>,
  alwaysNextChange: Accessor<TNextChange> = () => noChange,
): IMapClock {
  const [time, setTime] = createSignal(0);
  const hidden = createDocumentHidden();
  const reducedMotion = createReducedMotion();
  let elapsed = 0;
  let start: number | undefined;

  const now = () =>
    Math.max(
      start === undefined ? elapsed : performance.now() - start,
      untrack(time),
    );

  createEffect(() => {
    if (hidden()) {
      return;
    }

    const getNextChange = reducedMotion()
      ? alwaysNextChange()
      : earliestChange([nextChange(), alwaysNextChange()]);
    let timer: ReturnType<typeof setTimeout> | undefined;
    start = performance.now() - elapsed;

    const schedule = () => {
      const current = now();
      const next = getNextChange(current);

      if (next === Infinity) {
        return;
      }

      timer = setTimeout(() => {
        // A timer can fire a little before performance.now() gets to its
        // time, and then the frame would not change.
        setTime(Math.max(now(), next));
        schedule();
      }, next - current);
    };

    schedule();

    onCleanup(() => {
      clearTimeout(timer);
      elapsed = now();
      start = undefined;
    });
  });

  return {
    motionTime: () => (reducedMotion() ? 0 : time()),
    now,
    time,
  };
}

export function createFrameTime(
  time: Accessor<number>,
  nextChange: Accessor<TNextChange>,
) {
  return createMemo((drawnTime: number) => {
    const now = time();

    return changesBetween(nextChange(), drawnTime, now) ? now : drawnTime;
  }, untrack(time));
}
