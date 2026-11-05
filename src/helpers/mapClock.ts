import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
} from "solid-js";

import { changesBetween, type TNextChange } from "./mapFrames";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

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

export function createMapClock(
  nextChange: Accessor<TNextChange>,
): Accessor<number> {
  const [time, setTime] = createSignal(0);
  const hidden = createDocumentHidden();
  const reducedMotion = createReducedMotion();
  let elapsed = 0;

  createEffect(() => {
    if (hidden() || reducedMotion()) {
      return;
    }

    const getNextChange = nextChange();
    const start = performance.now() - elapsed;
    const now = () => Math.max(performance.now() - start, untrack(time));
    let timer: ReturnType<typeof setTimeout> | undefined;

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
    });
  });

  return () => (reducedMotion() ? 0 : time());
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
