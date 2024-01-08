/* @refresh reload */
import "./index.scss";
import "./helpers/initializeFirebase";

import { render } from "solid-js/web";

import { App } from "./App";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
render(() => <App />, document.getElementById("root")!);
