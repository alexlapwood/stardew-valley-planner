import { type Accessor, createComputed, createRoot } from "solid-js";

import { createFrameTime, createMapClock } from "./mapClock";
import {
  earliestChange,
  getNextFrameChange,
  noChange,
  type TNextChange,
} from "./mapFrames";

function every(interval: number): TNextChange {
  return (time) =>
    getNextFrameChange([{ frames: [1, 2], gid: 100, interval }], time);
}

const disposers: (() => void)[] = [];

function watch(accessor: Accessor<number>) {
  const values: number[] = [];

  createComputed(() => {
    values.push(accessor());
  });

  return values;
}

function startClock(nextChange: TNextChange) {
  return createRoot((dispose) => {
    disposers.push(dispose);

    const time = createMapClock(() => nextChange);

    return { dispose, time, times: watch(time) };
  });
}

let hidden = false;

function setHidden(value: boolean) {
  hidden = value;
  document.dispatchEvent(new Event("visibilitychange"));
}

type TQueryListener = (event: { matches: boolean }) => void;

function stubReducedMotion(matches: boolean) {
  const listeners = new Set<TQueryListener>();
  const query = {
    addEventListener: (_: string, listener: TQueryListener) => {
      listeners.add(listener);
    },
    matches,
    removeEventListener: (_: string, listener: TQueryListener) => {
      listeners.delete(listener);
    },
  };
  const matchMedia = vi.fn(() => query);

  vi.stubGlobal("matchMedia", matchMedia);

  return {
    matchMedia,
    setReducedMotion: (value: boolean) => {
      query.matches = value;
      listeners.forEach((listener) => {
        listener({ matches: value });
      });
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  hidden = false;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
});

afterEach(() => {
  disposers.splice(0).forEach((dispose) => {
    dispose();
  });
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("createMapClock", () => {
  it("moves the time only when a frame changes, with one timer at a time", () => {
    const { time, times } = startClock(every(500));

    expect(vi.getTimerCount()).toBe(1);

    vi.advanceTimersByTime(499);

    expect(time()).toBe(0);

    vi.advanceTimersByTime(1);

    expect(time()).toBe(500);

    vi.advanceTimersByTime(1000);

    expect(times).toEqual([0, 500, 1000, 1500]);
    expect(vi.getTimerCount()).toBe(1);
  });

  it("wakes at the earliest frame change of all the animations", () => {
    const { times } = startClock(earliestChange([every(450), every(1000)]));

    vi.advanceTimersByTime(1000);

    expect(times).toEqual([0, 450, 900, 1000]);
  });

  it("sets no timer when nothing animates", () => {
    startClock(noChange);

    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops when the page is hidden, and goes on from the same time when it shows again", () => {
    const { time, times } = startClock(every(500));

    vi.advanceTimersByTime(600);
    setHidden(true);

    expect(vi.getTimerCount()).toBe(0);

    vi.advanceTimersByTime(5000);

    expect(time()).toBe(500);

    setHidden(false);
    vi.advanceTimersByTime(399);

    expect(time()).toBe(500);

    vi.advanceTimersByTime(1);

    expect(times).toEqual([0, 500, 1000]);
  });

  it("stops when it is disposed", () => {
    const { dispose } = startClock(every(500));

    dispose();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("shows a still map at 0 ms when the device asks for reduced motion", () => {
    const { matchMedia } = stubReducedMotion(true);
    const { time } = startClock(every(500));

    vi.advanceTimersByTime(5000);

    expect(matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
    expect(time()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("follows live changes of the reduced motion setting", () => {
    const { setReducedMotion } = stubReducedMotion(false);
    const { time, times } = startClock(every(500));

    vi.advanceTimersByTime(500);
    setReducedMotion(true);

    expect(time()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);

    vi.advanceTimersByTime(5000);
    setReducedMotion(false);
    vi.advanceTimersByTime(500);

    expect(times).toEqual([0, 500, 0, 500, 1000]);
  });
});

describe("createFrameTime", () => {
  it("moves only when its own animations change frame", () => {
    const frameTimes = createRoot((dispose) => {
      disposers.push(dispose);

      const time = createMapClock(() =>
        earliestChange([every(300), every(500)]),
      );

      return watch(createFrameTime(time, () => every(500)));
    });

    vi.advanceTimersByTime(1000);

    expect(frameTimes).toEqual([0, 500, 1000]);
  });
});
