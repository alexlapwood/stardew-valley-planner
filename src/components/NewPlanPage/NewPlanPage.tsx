import "../Header/Header.css";
import "./NewPlanPage.css";

import cn from "clsx";
import { createSignal, For, Show } from "solid-js";

import {
  defaultFarmId,
  farmIds,
  type TFarmId,
} from "../../helpers/farmMapLoader";
import { farmTypes } from "../../helpers/farmTypes";
import {
  defaultPlanName,
  type IPlanSummary,
  maxPlanNameLength,
} from "../../state/plan";
import BigText from "../BigText/BigText";
import HeaderButton from "../Header/HeaderButton/HeaderButton";
import OpenButton from "../Header/OpenButton/OpenButton";
import NameField from "../NameField/NameField";
import FarmPreview from "./FarmPreview/FarmPreview";

interface IProps {
  createPlan: (farm: TFarmId, name: string) => Promise<unknown>;
  goBack?: () => void;
  images: HTMLImageElement[];
  openFile: () => void;
  plans: readonly IPlanSummary[];
}

export default function NewPlanPage(props: IProps) {
  const [farm, setFarm] = createSignal<TFarmId>(defaultFarmId);
  const [typedName, setTypedName] = createSignal<string>();
  const [isCreating, setIsCreating] = createSignal(false);

  const name = () => typedName() ?? defaultPlanName(farm(), props.plans);

  const canCreate = () => name().trim() !== "" && !isCreating();

  function selectFarm(farmId: TFarmId) {
    if (typedName()?.trim() === "") {
      setTypedName(undefined);
    }
    setFarm(farmId);
  }

  async function createPlan() {
    if (!canCreate()) {
      return;
    }

    // The new plan joins the plan list before its farm is ready, and the
    // default name must not move on to the next number while the page waits.
    setTypedName(name());
    setIsCreating(true);

    try {
      await props.createPlan(farm(), name().trim());
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div class="NewPlanPage flex-vertical">
      <div class="NewPlanPage--header">
        <Show when={props.goBack}>
          {(goBack) => (
            <HeaderButton
              growFrom="top-left"
              icon={<div class="sdv-button-left" />}
              label="Back"
              onClick={goBack()}
              testId="new-plan--back"
            />
          )}
        </Show>
        <div class="Header--buttons NewPlanPage--buttons">
          <OpenButton
            growFrom="top-right"
            openFile={() => {
              props.openFile();
            }}
            testId="new-plan--open"
          />
        </div>
      </div>
      <div class="NewPlanPage--body">
        <div class="NewPlanPage--panel sdv-panel-big">
          <div class="NewPlanPage--title">
            <BigText>New plan</BigText>
          </div>
          <div class="NewPlanPage--farms">
            <For each={farmIds}>
              {(farmId) => (
                <div
                  aria-label={farmTypes[farmId].name}
                  aria-pressed={farmId === farm()}
                  class={cn(
                    "NewPlanPage--farm",
                    "sdv-button-big",
                    "sdv-hover-effect",
                    { selected: farmId === farm() },
                  )}
                  data-testid={`new-plan--farm-${farmId}`}
                  onClick={() => {
                    selectFarm(farmId);
                  }}
                  role="button"
                >
                  <div class="NewPlanPage--preview">
                    <FarmPreview farm={farmId} images={props.images} />
                  </div>
                  <div class="Header--label NewPlanPage--farm-name">
                    <span class="Header--icon">{farmTypes[farmId].emoji}</span>
                    <BigText>{farmTypes[farmId].name}</BigText>
                  </div>
                </div>
              )}
            </For>
          </div>
          <div class="NewPlanPage--create">
            <BigText>Name</BigText>
            <NameField
              changeValue={setTypedName}
              class="NewPlanPage--name"
              label="Plan name"
              maxLength={maxPlanNameLength}
              submit={() => {
                void createPlan();
              }}
              testId="new-plan--name"
              value={name()}
            />
            <HeaderButton
              icon="🌱"
              isDisabled={!canCreate()}
              label="Create plan"
              onClick={() => {
                void createPlan();
              }}
              testId="new-plan--create"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
