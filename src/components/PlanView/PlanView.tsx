import {
  type Accessor,
  createEffect,
  createSignal,
  type JSXElement,
  on,
  Show,
} from "solid-js";

import type { TFarmId } from "../../helpers/farmMapLoader";
import { newFarmData, type TPlanInfo } from "../../state/plan";
import type { TPlanStore } from "../../state/planStore";
import NewPlanPage from "../NewPlanPage/NewPlanPage";

interface IProps {
  children: (plan: Accessor<TPlanInfo>, openNewPlan: () => void) => JSXElement;
  images: HTMLImageElement[];
  openFile: () => void;
  store: Pick<TPlanStore, "addPlan" | "planInfo" | "plans">;
}

export default function PlanView(props: IProps) {
  const [isNewPlanOpen, setIsNewPlanOpen] = createSignal(false);

  const openNewPlan = () => {
    setIsNewPlanOpen(true);
  };

  const closeNewPlan = () => {
    setIsNewPlanOpen(false);
  };

  // A plan from a file opens after the file picker closes, and the page does
  // not know when that is, so any plan that opens closes the page.
  createEffect(
    on(() => props.store.planInfo()?.id, closeNewPlan, { defer: true }),
  );

  const createPlan = (farm: TFarmId, name: string) =>
    props.store.addPlan(newFarmData(farm), name);

  return (
    <Show
      fallback={
        <NewPlanPage
          createPlan={createPlan}
          goBack={
            props.store.planInfo() === undefined ? undefined : closeNewPlan
          }
          images={props.images}
          openFile={() => {
            props.openFile();
          }}
          plans={props.store.plans()}
        />
      }
      when={!isNewPlanOpen() && props.store.planInfo()}
    >
      {(plan) => props.children(plan, openNewPlan)}
    </Show>
  );
}
