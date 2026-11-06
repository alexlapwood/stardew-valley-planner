import { createEffect, createResource } from "solid-js";

import {
  loadOneSeasonScene,
  type TFarmId,
} from "../../../helpers/farmMapLoader";
import { drawFarmPreview } from "./FarmPreview.canvas";

interface IProps {
  farm: TFarmId;
  images: HTMLImageElement[];
}

const previewSeason = "spring";

async function loadPreviewScene(farm: TFarmId) {
  try {
    return await loadOneSeasonScene(farm, previewSeason);
  } catch (error) {
    console.error(
      `Could not load the ${farm} farm map for its preview.`,
      error,
    );
    throw error;
  }
}

export default function FarmPreview(props: IProps) {
  let canvasRef: HTMLCanvasElement | undefined;

  const [scene] = createResource(() => props.farm, loadPreviewScene);

  const loadedScene = () => (scene.error === undefined ? scene() : undefined);

  createEffect(() => {
    const currentScene = loadedScene();

    if (canvasRef !== undefined && currentScene !== undefined) {
      drawFarmPreview(canvasRef, currentScene, props.images);
    }
  });

  return (
    <canvas
      class="FarmPreview"
      data-testid={`farm-preview-${props.farm}`}
      ref={canvasRef}
    />
  );
}
