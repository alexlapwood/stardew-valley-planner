import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";
import "./index.css";

ReactDOM.render(<App waitForImages={true} />, document.getElementById("root"));

const updatePageSize = () => {
  document.body.style.height =
    (800 * window.innerHeight) / window.innerWidth + "px";
  document.body.style.transform = "scale(" + window.innerWidth / 800 + ")";
};

window.onload = updatePageSize;
window.onresize = updatePageSize;
