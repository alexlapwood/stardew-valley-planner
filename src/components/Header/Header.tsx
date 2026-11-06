import "./Header.css";

import { createCtrlKey } from "../../helpers/keyboard";
import type { IPlanSummary } from "../../state/plan";
import HeaderButton from "./HeaderButton/HeaderButton";
import OpenButton from "./OpenButton/OpenButton";
import PlanSwitcher from "./PlanSwitcher/PlanSwitcher";
import UpgradesMenu from "./UpgradesMenu/UpgradesMenu";

interface IProps {
  changeLooks: (looks: IFarmLooks) => void;
  changePlan: (id: string) => void;
  deletePlan: (id: string) => void;
  looks: IFarmLooks;
  newPlan: () => void;
  openFile: () => void;
  plan: IPlanSummary;
  plans: readonly IPlanSummary[];
  renamePlan: (id: string, name: string) => void;
  saveFile: () => void;
}

export default function Header(props: IProps) {
  createCtrlKey("s", () => {
    props.saveFile();
  });

  return (
    <div class="Header">
      <PlanSwitcher
        changePlan={(id) => {
          props.changePlan(id);
        }}
        deletePlan={(id) => {
          props.deletePlan(id);
        }}
        newPlan={() => {
          props.newPlan();
        }}
        plan={props.plan}
        plans={props.plans}
        renamePlan={(id, name) => {
          props.renamePlan(id, name);
        }}
      />
      <div class="Header--buttons">
        <UpgradesMenu
          changeLooks={(looks) => {
            props.changeLooks(looks);
          }}
          looks={props.looks}
        />
        <OpenButton
          growFrom="top"
          openFile={() => {
            props.openFile();
          }}
          testId="header--open"
        />
        <HeaderButton
          growFrom="top-right"
          icon="💾"
          label="Save"
          onClick={() => {
            props.saveFile();
          }}
          testId="header--save"
        />
      </div>
    </div>
  );
}
