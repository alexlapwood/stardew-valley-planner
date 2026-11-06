import { type Accessor, createEffect, onCleanup, onMount } from "solid-js";

export function createCtrlKey(key: string, onPress: () => void) {
  const onKeyDown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === key) {
      event.preventDefault();
      onPress();
    }
  };

  onMount(() => {
    document.addEventListener("keydown", onKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", onKeyDown);
  });
}

export function createEscapeKey(
  isOpen: Accessor<boolean>,
  onEscape: () => void,
) {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onEscape();
    }
  };

  createEffect(() => {
    if (!isOpen()) {
      return;
    }

    document.addEventListener("keydown", onKeyDown);

    onCleanup(() => {
      document.removeEventListener("keydown", onKeyDown);
    });
  });
}
