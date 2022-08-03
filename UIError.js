import * as client from "./client.js";

export class UIError extends HTMLElement {
  /**
   * @type {HTMLTextAreaElement}
   */
  #message;

  constructor() {
    super();

    this.appendChild(client.cloneTemplate("error-template"));
    this.onclick = this.#handleClick.bind(this);
    this.hide();

    const message = this.querySelector(".message");
    client.assertElement(message, HTMLTextAreaElement);
    this.#message = message;
  }

  /**
   * Handles clicks on the element
   * @param {Event} e
   */
  #handleClick(e) {
    if (e.target instanceof HTMLElement && e.target.tagName === "BUTTON") {
      window.location.reload();
    }
  }

  /**
   * Displays the about box
   * @param {Error|string|ErrorEvent|PromiseRejectionEvent} error
   */
  #formatError(error) {
    if (typeof error === "undefined") {
      return "";
    }

    if (error instanceof PromiseRejectionEvent) {
      error = error.reason;
    }

    if (error instanceof ErrorEvent) {
      const errorMessage = `${error.message}\n\nIn: ${error.filename} on line ${error.lineno}:${error.colno}`;

      error = error.error || errorMessage;
    }

    // Handle OpenCV errors so readable
    if (typeof error === "number") {
      if (!isNaN(error) && typeof cv !== "undefined") {
        return "Exception: " + cv.exceptionFromPtr(error).msg;
      }
    }

    // Handle other type of OpenCV errors so readable
    if (typeof error === "string") {
      let ptr = Number(error.split(" ")[0]);
      if (!isNaN(ptr) && typeof cv !== "undefined") {
        return "Exception: " + cv.exceptionFromPtr(ptr).msg;
      }

      return error;
    }

    if (error instanceof Error && error.stack) {
      return error.stack;
    }

    return "";
  }

  /**
   * Displays the about box
   * @param {Error|string|ErrorEvent|PromiseRejectionEvent} error
   */
  show(error) {
    this.#message.value = this.#formatError(error);
    this.style.display = "";
  }

  /**
   * Hides the about box
   */
  hide() {
    this.style.display = "none";
  }
}

customElements.define("ui-error", UIError);
