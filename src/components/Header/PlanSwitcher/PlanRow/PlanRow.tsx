import cn from "clsx";
import { createSignal, type JSXElement, Match, Switch } from "solid-js";

import { type IPlanSummary, maxPlanNameLength } from "../../../../state/plan";
import BigText from "../../../BigText/BigText";
import NameField from "../../../NameField/NameField";

export type TPlanRowAction = "delete" | "rename";

interface IProps {
  action?: TPlanRowAction;
  changePlan: () => void;
  deletePlan: () => void;
  isSelected: boolean;
  plan: IPlanSummary;
  renamePlan: (name: string) => void;
  setAction: (action?: TPlanRowAction) => void;
}

interface IRowButtonProps {
  children: JSXElement;
  label: string;
  onClick: () => void;
  testId: string;
}

function RowButton(props: IRowButtonProps) {
  return (
    <div
      aria-label={props.label}
      class="PlanRow--button sdv-button sdv-hover-effect"
      data-testid={props.testId}
      onClick={(event) => {
        event.stopPropagation();
        props.onClick();
      }}
      role="button"
    >
      {props.children}
    </div>
  );
}

export default function PlanRow(props: IProps) {
  const [name, setName] = createSignal("");

  const testId = (part: string) => `plan-switcher--${part}-${props.plan.id}`;

  const rowClass = () =>
    cn("PlanRow", "sdv-list-item", { selected: props.isSelected });

  const question = () => `Delete "${props.plan.name}"?`;

  function startRename() {
    setName(props.plan.name);
    props.setAction("rename");
  }

  function keepName() {
    const newName = name().trim();

    if (newName === "") {
      return;
    }

    props.setAction();

    if (newName !== props.plan.name) {
      props.renamePlan(newName);
    }
  }

  const nameAndButtons = () => (
    <>
      <div class="PlanRow--text">
        <BigText>{props.plan.name}</BigText>
      </div>
      <RowButton
        label={`Rename ${props.plan.name}`}
        onClick={startRename}
        testId={testId("rename")}
      >
        <span class="Header--icon">✏️</span>
      </RowButton>
      <RowButton
        label={`Delete ${props.plan.name}`}
        onClick={() => {
          props.setAction("delete");
        }}
        testId={testId("delete")}
      >
        <span class="Header--icon">🗑️</span>
      </RowButton>
    </>
  );

  return (
    <Switch
      fallback={
        <div
          aria-label={props.plan.name}
          class={rowClass()}
          data-testid={testId("plan")}
          onClick={() => {
            props.changePlan();
          }}
          role="button"
        >
          {nameAndButtons()}
        </div>
      }
    >
      <Match when={props.action === "rename"}>
        {/* The list is as wide as its widest row, so the hidden row stays
            under the field to keep the list as wide as before. */}
        <div class={cn(rowClass(), "PlanRow--renaming")}>
          {nameAndButtons()}
          <NameField
            changeValue={setName}
            class="PlanRow--name"
            isSelectedAtStart
            label={`New name for ${props.plan.name}`}
            maxLength={maxPlanNameLength}
            submit={keepName}
            testId="plan-switcher--name"
            value={name()}
          />
        </div>
      </Match>
      <Match when={props.action === "delete"}>
        <div
          aria-label={question()}
          class={rowClass()}
          data-testid={testId("plan")}
          role="group"
        >
          <div class="PlanRow--text">
            <BigText>{question()}</BigText>
          </div>
          <RowButton
            label="Cancel"
            onClick={() => {
              props.setAction();
            }}
            testId="plan-switcher--cancel-delete"
          >
            <BigText>Cancel</BigText>
          </RowButton>
          <RowButton
            label={`Delete ${props.plan.name}`}
            onClick={() => {
              props.deletePlan();
            }}
            testId="plan-switcher--confirm-delete"
          >
            <BigText>Delete</BigText>
          </RowButton>
        </div>
      </Match>
    </Switch>
  );
}
