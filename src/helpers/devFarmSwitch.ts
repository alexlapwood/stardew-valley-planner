import {
  defaultFarmLooks,
  farmhouseLooks,
  greenhouseLooks,
} from "./defaultBuildings";
import { defaultFarmId, isFarmId, type TFarmId } from "./farmMapLoader";

export interface IFarmChoice {
  farm: TFarmId;
  looks: IFarmLooks;
}

function pickLook<T extends number | string>(
  looks: readonly T[],
  value: string | null,
) {
  return looks.find((look) => String(look) === value);
}

export function parseDevFarmSwitch(search: string): IFarmChoice {
  const params = new URLSearchParams(search);
  const farm = params.get("farm");

  return {
    farm: farm !== null && isFarmId(farm) ? farm : defaultFarmId,
    looks: {
      greenhouse:
        pickLook(greenhouseLooks, params.get("greenhouse")) ??
        defaultFarmLooks.greenhouse,
      house:
        pickLook(farmhouseLooks, params.get("house")) ?? defaultFarmLooks.house,
    },
  };
}
