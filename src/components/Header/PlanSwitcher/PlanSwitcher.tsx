import cn from "clsx";
import { createSignal, For, onCleanup, onMount } from "solid-js";

import { createClickAway } from "../../../helpers/clickAway";
import { farmTypes } from "../../../helpers/farmTypes";
import { groupPlansByFarm, type IPlanSummary } from "../../../state/plan";
import BigText from "../../BigText/BigText";
import PlanRow, { type TPlanRowAction } from "./PlanRow/PlanRow";

interface IProps {
  changePlan: (id: string) => void;
  deletePlan: (id: string) => void;
  newPlan: () => void;
  plan: IPlanSummary;
  plans: readonly IPlanSummary[];
  renamePlan: (id: string, name: string) => void;
}

interface IRowAction {
  action: TPlanRowAction;
  id: string;
}

export default function PlanSwitcher(props: IProps) {
  let rootRef: HTMLDivElement | undefined;

  const [isOpen, setIsOpen] = createSignal(false);
  const [rowAction, setRowAction] = createSignal<IRowAction>();

  const label = () => `${farmTypes[props.plan.farm].name} > ${props.plan.name}`;

  const close = () => {
    setIsOpen(false);
    setRowAction(undefined);
  };

  createClickAway(() => rootRef, isOpen, close);

  const toggle = () => {
    if (isOpen()) {
      close();
    } else {
      setIsOpen(true);
    }
  };

  const actionFor = (id: string) => {
    const current = rowAction();

    return current?.id === id ? current.action : undefined;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") {
      return;
    }

    if (rowAction() === undefined) {
      close();
    } else {
      setRowAction(undefined);
    }
  };

  onMount(() => {
    document.addEventListener("keydown", onKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div class="PlanSwitcher" ref={rootRef}>
      <div
        aria-expanded={isOpen()}
        aria-label={label()}
        class={cn(
          "PlanSwitcher--trigger",
          "sdv-button-big",
          "sdv-hover-effect",
          "sdv-grow-from-top-left",
          {
            selected: isOpen(),
          },
        )}
        data-testid="plan-switcher"
        onClick={toggle}
        role="button"
      >
        <div class="Header--label">
          <span class="Header--icon">{farmTypes[props.plan.farm].emoji}</span>
          <div class="PlanSwitcher--name">
            <BigText>{label()}</BigText>
          </div>
          <div
            class={cn("PlanSwitcher--arrow", {
              "sdv-button-down": !isOpen(),
              "sdv-button-up": isOpen(),
            })}
          />
        </div>
      </div>
      {isOpen() && (
        <div
          class="PlanSwitcher--list sdv-list"
          data-testid="plan-switcher--list"
        >
          <For each={groupPlansByFarm(props.plans)}>
            {(group) => (
              <>
                <div
                  class="PlanSwitcher--heading"
                  data-testid={`plan-switcher--heading-${group.farm}`}
                >
                  <span class="Header--icon">
                    {farmTypes[group.farm].emoji}
                  </span>
                  <BigText>{farmTypes[group.farm].name}</BigText>
                </div>
                <For each={group.plans}>
                  {(plan) => (
                    <PlanRow
                      action={actionFor(plan.id)}
                      changePlan={() => {
                        close();
                        props.changePlan(plan.id);
                      }}
                      deletePlan={() => {
                        setRowAction(undefined);
                        props.deletePlan(plan.id);
                      }}
                      isSelected={plan.id === props.plan.id}
                      plan={plan}
                      renamePlan={(name) => {
                        props.renamePlan(plan.id, name);
                      }}
                      setAction={(action) => {
                        setRowAction(
                          action === undefined
                            ? undefined
                            : { action, id: plan.id },
                        );
                      }}
                    />
                  )}
                </For>
              </>
            )}
          </For>
          <div
            aria-label="New plan"
            class="sdv-list-item"
            data-testid="plan-switcher--new-plan"
            onClick={() => {
              close();
              props.newPlan();
            }}
            role="button"
          >
            <div class="PlanSwitcher--new-plan margin-horizontal">
              <div class="sdv-button-add" />
              <BigText>New plan</BigText>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
