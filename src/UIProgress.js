import * as client from "./client.js";

export class UIProgress extends HTMLElement {
  constructor() {
    super();

    this.appendChild(client.cloneTemplate("loading-template"));
    this._progressBar = this.querySelector("progress");
    client.assertElement(this._progressBar, HTMLProgressElement);
    this.hide();
  }

  show() {
    this.style.display = "";
  }

  hide() {
    this.style.display = "none";
  }

  step(amount = 1) {
    this.value += amount;
  }

  get max() {
    return this._progressBar.max;
  }

  set max(value) {
    this._progressBar.max = value;
  }

  get value() {
    return this._progressBar.value;
  }

  set value(value) {
    this._progressBar.value = value;
  }
}

customElements.define("ui-progress", UIProgress);
