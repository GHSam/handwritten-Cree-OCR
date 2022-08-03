import * as client from "./client.js";

export class UIAbout extends HTMLElement {
  constructor() {
    super();

    this.appendChild(client.cloneTemplate("about-template"));
    this.onclick = this.#handleClick.bind(this);
    this.hide();
  }

  /**
   * Handles clicks on the element
   * @param {Event} e
   */
  #handleClick(e) {
    if (
      e.target === this ||
      (e.target instanceof HTMLElement && e.target.tagName === "BUTTON")
    ) {
      this.hide();
    }
  }

  /**
   * Displays the about box
   */
  show() {
    this.style.display = "";
  }

  /**
   * Hides the about box
   */
  hide() {
    this.style.display = "none";
  }

  /**
   * Toggles the visibility of the about box
   */
  toggle() {
    if (!this.style.display) {
      this.hide();
    } else {
      this.show();
    }
  }
}

customElements.define("ui-about", UIAbout);
