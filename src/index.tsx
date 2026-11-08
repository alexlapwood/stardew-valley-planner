/* @refresh reload */
import "./styles/index.css";

import { inject } from "@vercel/analytics";
import { render } from "solid-js/web";

import { App } from "./App";

const root = document.getElementById("root");

if (root === null) {
  throw new Error('Could not find the element with id "root".');
}

inject();

render(() => <App />, root);
