/**
 * @typedef {Object} SelectionBox
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

export class UISelectArea extends HTMLElement {
  /**
   * @type {HTMLCanvasElement}
   */
  #canvas;

  /**
   * @type {CanvasRenderingContext2D}
   */
  #context;

  /**
   * @type {SelectionBox|null}
   */
  #selection;

  /**
   * @type {number}
   */
  #pointerStartX;

  /**
   * @type {number}
   */
  #pointerStartY;

  /**
   * @type {Set<number>}
   */
  #currentPoints;

  /**
   * @type {boolean}
   */
  #ignorePointerMove;

  /**
   * @type {boolean}
   */
  #disabled;

  constructor() {
    super();

    this.#pointerStartX = -1;
    this.#pointerStartY = -1;
    this.#selection = null;
    this.#disabled = true;
    this.#currentPoints = new Set();
    this.#ignorePointerMove = true;
    this.#canvas = document.createElement("canvas");
    this.#canvas.width = 0;
    this.#canvas.height = 0;
    this.appendChild(this.#canvas);

    const context = this.#canvas.getContext("2d");
    if (context == null) {
      throw Error("Could not create context. Returned null.");
    }

    this.#context = context;

    document.addEventListener("pointerdown", this.#handleDown.bind(this));
    document.addEventListener("pointermove", this.#handleMove.bind(this));
    document.addEventListener("pointerup", this.#handleUp.bind(this));
    document.addEventListener("pointercancel", this.#handleCancel.bind(this));

    // If page is resized, should redraw any selections as they will need to
    // be rescaled
    new ResizeObserver(this.#draw.bind(this)).observe(this.#canvas);
  }

  /**
   * Updates the drawn selection
   */
  #draw() {
    this.#context.clearRect(0, 0, this.#canvas.width, this.#canvas.height);

    const selection = this.#selection;
    if (!selection || this.disabled) {
      return;
    }

    this.#context.fillStyle = "rgba(0,0,0,0.5)";
    this.#context.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
    this.#context.clearRect(
      selection.x,
      selection.y,
      selection.width,
      selection.height
    );

    const canvasPosition = this.#canvas.getBoundingClientRect();
    const scale = Math.max(
      this.width / canvasPosition.width,
      this.height / canvasPosition.height
    );
    const dashSize = Math.max(2, 2 * scale);
    const lineWidth = Math.max(1, 1 * scale);
    const hitBox = Math.max(18, 18 * scale);

    this.#context.lineWidth = lineWidth;
    this.#context.strokeStyle = "white";
    this.#context.setLineDash([]);
    this.#context.strokeRect(
      selection.x,
      selection.y,
      selection.width,
      selection.height
    );

    this.#context.lineWidth = lineWidth;
    this.#context.strokeStyle = "#005fff";
    this.#context.setLineDash([dashSize, dashSize]);
    this.#context.strokeRect(
      selection.x,
      selection.y,
      selection.width,
      selection.height
    );

    this.#context.fillStyle = "#005fff";
    this.#context.fillRect(
      selection.x - hitBox / 2,
      selection.y - hitBox / 2,
      hitBox,
      hitBox
    );

    this.#context.fillRect(
      selection.x + selection.width - hitBox / 2,
      selection.y - hitBox / 2,
      hitBox,
      hitBox
    );

    this.#context.fillRect(
      selection.x - hitBox / 2,
      selection.y + selection.height - hitBox / 2,
      hitBox,
      hitBox
    );

    this.#context.fillRect(
      selection.x + selection.width - hitBox / 2,
      selection.y + selection.height - hitBox / 2,
      hitBox,
      hitBox
    );
  }

  /**
   * @param {number} x
   * @returns
   */
  #clampWidth(x) {
    return Math.max(0, Math.min(x, this.#canvas.width));
  }

  /**
   * @param {number} y
   * @returns
   */
  #clampHeight(y) {
    return Math.max(0, Math.min(y, this.#canvas.height));
  }

  /**
   * Handles the down event
   * @param {PointerEvent} e
   */
  #handleDown(e) {
    if (e.target !== this.#canvas) {
      return;
    }

    const canvasPosition = this.#canvas.getBoundingClientRect();
    const xScale = this.#canvas.width / canvasPosition.width;
    const yScale = this.#canvas.height / canvasPosition.height;
    const x = (e.clientX - canvasPosition.x) * xScale;
    const y = (e.clientY - canvasPosition.y) * yScale;

    this.#pointerStartX = this.#clampWidth(x);
    this.#pointerStartY = this.#clampHeight(y);
    this.#currentPoints.add(e.pointerId);
    this.#ignorePointerMove = this.#currentPoints.size !== 1;

    // Check for clicks on hit boxes
    const scale = Math.max(
      this.width / canvasPosition.width,
      this.height / canvasPosition.height
    );
    const isTouch = e.pointerType === "touch";

    const hitBoxSize = isTouch ? 28 : 18;
    const hitBox = Math.max(hitBoxSize, hitBoxSize * scale);
    const selection = this.#selection;
    if (selection) {
      const isWithinLeftX =
        x >= selection.x - hitBox / 2 && x <= selection.x + hitBox / 2;
      const isWithinRightX =
        x >= selection.x + selection.width - hitBox / 2 &&
        x <= selection.x + selection.width + hitBox / 2;

      const isWithinTopY =
        y >= selection.y - hitBox / 2 && y <= selection.y + hitBox / 2;
      const isWithinBottomY =
        y >= selection.y + selection.height - hitBox / 2 &&
        y <= selection.y + selection.height + hitBox / 2;

      if (isWithinLeftX && isWithinTopY) {
        this.#pointerStartX = selection.x + selection.width;
        this.#pointerStartY = selection.y + selection.height;
      }

      if (isWithinLeftX && isWithinBottomY) {
        this.#pointerStartX = selection.x + selection.width;
        this.#pointerStartY = selection.y;
      }

      if (isWithinRightX && isWithinTopY) {
        this.#pointerStartX = selection.x;
        this.#pointerStartY = selection.y + selection.height;
      }

      if (isWithinRightX && isWithinBottomY) {
        this.#pointerStartX = selection.x;
        this.#pointerStartY = selection.y;
      }
    }
  }

  /**
   * Handles the move event
   * @param {PointerEvent} e
   */
  #handleMove(e) {
    // Change mouse cursor if over a handle
    this.#updateCursor(e);

    // Only handle single points
    if (this.#ignorePointerMove || this.#currentPoints.size !== 1) {
      return;
    }

    const canvasPosition = this.#canvas.getBoundingClientRect();
    const xScale = this.#canvas.width / canvasPosition.width;
    const yScale = this.#canvas.height / canvasPosition.height;
    const pointerX = this.#clampWidth((e.clientX - canvasPosition.x) * xScale);
    const pointerY = this.#clampHeight((e.clientY - canvasPosition.y) * yScale);

    const x = Math.min(pointerX, this.#pointerStartX);
    const y = Math.min(pointerY, this.#pointerStartY);
    const width = Math.max(pointerX, this.#pointerStartX) - x;
    const height = Math.max(pointerY, this.#pointerStartY) - y;

    this.#selection = { x, y, height, width };
    this.#draw();
  }

  /**
   * Handles the up event
   * @param {PointerEvent} e
   */
  #handleUp(e) {
    // Ignore future moves as if there was more than one touch point
    // we want to ignore others until all are removed at touch
    // started again
    this.#ignorePointerMove = true;
    this.#currentPoints.delete(e.pointerId);
  }

  /**
   * Handles the cancel event
   * @param {PointerEvent} e
   */
  #handleCancel(e) {
    this.#ignorePointerMove = true;
    this.#currentPoints.clear();
  }

  /**
   *
   * @param {PointerEvent} e
   * @returns
   */
  #updateCursor(e) {
    const selection = this.#selection;
    if (this.#disabled || !selection) {
      this.#canvas.style.cursor = "";
      return;
    }

    const canvasPosition = this.#canvas.getBoundingClientRect();
    const xScale = this.#canvas.width / canvasPosition.width;
    const yScale = this.#canvas.height / canvasPosition.height;
    const x = (e.clientX - canvasPosition.x) * xScale;
    const y = (e.clientY - canvasPosition.y) * yScale;

    // Check for clicks on hit boxes
    const scale = Math.max(
      this.width / canvasPosition.width,
      this.height / canvasPosition.height
    );
    const hitBox = Math.max(18, 18 * scale);
    const isWithinLeftX =
      x >= selection.x - hitBox / 2 && x <= selection.x + hitBox / 2;
    const isWithinRightX =
      x >= selection.x + selection.width - hitBox / 2 &&
      x <= selection.x + selection.width + hitBox / 2;

    const isWithinTopY =
      y >= selection.y - hitBox / 2 && y <= selection.y + hitBox / 2;
    const isWithinBottomY =
      y >= selection.y + selection.height - hitBox / 2 &&
      y <= selection.y + selection.height + hitBox / 2;

    const isOverHitBox =
      (isWithinLeftX && isWithinTopY) ||
      (isWithinLeftX && isWithinBottomY) ||
      (isWithinRightX && isWithinTopY) ||
      (isWithinRightX && isWithinBottomY);

    this.#canvas.style.cursor = isOverHitBox ? "pointer" : "";
  }

  clear() {
    this.#selection = null;
    this.#draw();
  }

  get selection() {
    return this.disabled ? null : this.#selection;
  }

  get width() {
    return this.#canvas.width;
  }

  set width(val) {
    this.clear();
    this.#canvas.width = val;
  }

  get height() {
    return this.#canvas.height;
  }

  set height(val) {
    this.clear();
    this.#canvas.height = val;
  }

  get disabled() {
    return this.#disabled;
  }

  set disabled(val) {
    this.#disabled = val;

    if (!val) {
      if (!this.#selection && this.width && this.height) {
        this.#selection = {
          x: this.width / 4,
          y: this.height / 4,
          width: this.width / 2,
          height: this.height / 2,
        };
      }
    }

    this.#draw();
  }
}

customElements.define("ui-select-area", UISelectArea);
