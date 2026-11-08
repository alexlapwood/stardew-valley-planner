import {
  type Accessor,
  createComputed,
  createMemo,
  createSignal,
} from "solid-js";

import {
  getBuildsNextChange,
  type IBuild,
  type IBuildAnimation,
  type IBuildPlan,
  isBuildOn,
  isBuildOver,
} from "../../helpers/buildAnimation";

// The animations are on the screen only, not in the plan, so that a plan
// that opens shows its buildings as they are.
export function createBuildAnimations(plan: Accessor<IBuildPlan>) {
  const [animations, setAnimations] = createSignal<readonly IBuildAnimation[]>(
    [],
  );

  // An animation that stops does not come back, also when its date or its
  // building comes back.
  createComputed(() => {
    const current = plan();

    setAnimations((previous) => {
      const live = previous.filter((animation) =>
        isBuildOn(animation, current),
      );

      return live.length === previous.length ? previous : live;
    });
  });

  const nextChange = createMemo(() => getBuildsNextChange(animations()));

  function start(build: IBuild, date: number, time: number) {
    setAnimations((previous) => [
      ...previous.filter((animation) => !isBuildOver(animation, time)),
      { ...build, date, start: time },
    ]);
  }

  return { animations, nextChange, start };
}
