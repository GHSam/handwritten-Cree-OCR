import * as client from "./client.js";
import * as imageUtils from "./image.js";
import { sleepTick } from "./timers.js";
import * as syllabics from "./syllabics.js";
import { UIAbout } from "./UIAbout.js";
import { UIProgress } from "./UIProgress.js";
import { UISelectArea } from "./UISelectArea.js";

export class UIMain extends HTMLElement {
  /**
   * @type {Array<string>}
   */
  #creeClasses;
  /**
   * @type {import('./index.js').LayersModel}
   */
  #model;
  /**
   * @type {import('./index.js').tfjs}
   */
  #tf;
  /**
   * @type {UIAbout}
   */
  #uiAbout;
  /**
   * @type {UIProgress}
   */
  #uiProgress;
  /**
   * @type {HTMLInputElement}
   */
  #fileInput;
  /**
   * @type {HTMLTextAreaElement}
   */
  #output;
  /**
   * @type {HTMLCanvasElement}
   */
  #canvas;
  /**
   * @type {HTMLCanvasElement}
   */
  #debugCanvas;
  /**
   * @type {CanvasRenderingContext2D}
   */
  #ctx;
  /**
   * @type {CanvasRenderingContext2D}
   */
  #debugCtx;
  /**
   * @type {UISelectArea}
   */
  #uiSelectArea;
  /**
   * @type {HTMLButtonElement}
   */
  #selectAreaButton;
  /**
   * @type {HTMLFieldSetElement}
   */
  #toolbar;

  /**
   * Creates an instance of UIMain
   * @param {Array<string>} creeClasses
   * @param {import('./index.js').LayersModel} model
   * @param {import('./index.js').tfjs} tf
   */
  constructor(creeClasses, model, tf) {
    super();

    this.#creeClasses = creeClasses;
    this.#model = model;
    this.#tf = tf;

    this.appendChild(client.cloneTemplate("ui-template"));
    this.#uiAbout = new UIAbout();
    this.appendChild(this.#uiAbout);
    this.#uiProgress = new UIProgress();
    this.appendChild(this.#uiProgress);

    const aboutButton = this.querySelector(".about-button");
    const debugButton = this.querySelector(".debug-button");
    const rotateLeftButton = this.querySelector(".rotate-left-button");
    const rotateRightButton = this.querySelector(".rotate-right-button");
    const selectAreaButton = this.querySelector(".select-area-button");
    const loadButton = this.querySelector(".load-button");
    const convertButton = this.querySelector(".convert-button");
    const fileInput = this.querySelector(".file-input");
    const canvas = this.querySelector(".canvas");
    const debugCanvas = this.querySelector(".debug-canvas");
    const uiSelectArea = this.querySelector("ui-select-area");
    const output = this.querySelector("textarea");
    const toolbar = this.querySelector(".toolbar");

    if (uiSelectArea) {
      customElements.upgrade(uiSelectArea);
    }

    client.assertElement(aboutButton, HTMLButtonElement);
    client.assertElement(debugButton, HTMLButtonElement);
    client.assertElement(rotateLeftButton, HTMLButtonElement);
    client.assertElement(rotateRightButton, HTMLButtonElement);
    client.assertElement(selectAreaButton, HTMLButtonElement);
    client.assertElement(convertButton, HTMLButtonElement);
    client.assertElement(loadButton, HTMLButtonElement);
    client.assertElement(fileInput, HTMLInputElement);
    client.assertElement(canvas, HTMLCanvasElement);
    client.assertElement(debugCanvas, HTMLCanvasElement);
    client.assertElement(uiSelectArea, UISelectArea);
    client.assertElement(output, HTMLTextAreaElement);
    client.assertElement(toolbar, HTMLFieldSetElement);

    this.#uiSelectArea = uiSelectArea;
    this.#selectAreaButton = selectAreaButton;
    this.#fileInput = fileInput;
    this.#toolbar = toolbar;
    this.#canvas = canvas;
    this.#debugCanvas = debugCanvas;
    this.#output = output;

    const ctx = canvas.getContext("2d");
    const debugCtx = debugCanvas.getContext("2d");
    if (ctx == null || debugCtx == null) {
      throw Error("Problem creating rendering context. Returned null.");
    }

    this.#ctx = ctx;
    this.#debugCtx = debugCtx;

    fileInput.onchange = this.#handleInputFileChange.bind(this);
    debugButton.onclick = this.#handleDebugClick.bind(this);
    rotateLeftButton.onclick = this.#onRotateCounterLeftClick.bind(this);
    rotateRightButton.onclick = this.#onRotateRightClick.bind(this);
    selectAreaButton.onclick = this.#onSelectArea.bind(this);
    convertButton.onclick = this.#recognise.bind(this);
    loadButton.onclick = () => this.#fileInput.click();
    aboutButton.onclick = () => this.#uiAbout.toggle();
  }

  /**
   * Returns if the UI buttons are disabled
   */
  get disabled() {
    return this.#toolbar.hasAttribute("disabled");
  }

  /**
   * Enables or disables the UI buttons
   */
  set disabled(val) {
    if (val) {
      this.#toolbar.setAttribute("disabled", "true");
    } else {
      this.#toolbar.removeAttribute("disabled");
    }
  }

  /**
   * Synchronises the dimensions of the debug canvas and
   * UISelectArea with the main canvas
   */
  #syncDimensions() {
    this.#debugCanvas.width = this.#canvas.width;
    this.#debugCanvas.height = this.#canvas.height;
    this.#uiSelectArea.width = this.#canvas.width;
    this.#uiSelectArea.height = this.#canvas.height;
  }

  async #handleInputFileChange() {
    const files = this.#fileInput.files;
    if (!files || !files.length) {
      return;
    }

    const img = await client.loadImageFile(files[0]);
    this.#canvas.width = img.width;
    this.#canvas.height = img.height;
    this.#syncDimensions();

    const scale = Math.min(1920 / img.width, 1080 / img.height);
    if (scale < 1) {
      const image = imageUtils.read(img);
      imageUtils.resize(image, scale);
      imageUtils.write(this.#canvas, image);
      image.delete();

      this.#syncDimensions();
    } else {
      this.#ctx.drawImage(img, 0, 0, this.#canvas.width, this.#canvas.height);
    }

    this.#clearSelection();
    this.#recognise();
  }

  #handleDebugClick() {
    if (this.#debugCanvas.style.display) {
      this.#debugCanvas.style.display = "";
    } else {
      this.#debugCanvas.style.display = "none";
    }
  }

  async #recognise() {
    this.disabled = true;
    this.#debugCtx.clearRect(
      0,
      0,
      this.#debugCanvas.width,
      this.#debugCanvas.height
    );
    this.#uiProgress.max = 100;
    this.#uiProgress.value = 0;
    this.#uiProgress.show();

    await sleepTick();
    const image = cv.imread(this.#canvas);
    this.#uiProgress.step();
    await sleepTick();
    await sleepTick();

    cv.cvtColor(image, image, cv.COLOR_RGBA2GRAY, 0);
    this.#uiProgress.step(0.5);
    await sleepTick();
    await sleepTick();

    // A slight blur helps improve contour matching
    cv.GaussianBlur(image, image, new cv.Size(7, 7), 1);
    this.#uiProgress.step();
    await sleepTick();
    await sleepTick();

    // Pick n based on image width (must be an odd number)
    let n = Math.floor(this.#canvas.width / 10);
    if (n % 2 != 1) {
      n += 1;
    }

    cv.adaptiveThreshold(
      image,
      image,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      n,
      30
    );
    this.#uiProgress.step(1.5);
    await sleepTick();
    await sleepTick();

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(
      image,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );
    this.#uiProgress.step(2);
    await sleepTick();
    await sleepTick();

    const selection = this.#uiSelectArea.selection;
    /**
     * @type {import('./syllabics.js').Box[]}
     */
    const boxes = [];
    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const box = cv.boundingRect(contour);
      // Ignore really long or wide rectangles as no syllabics match this
      if (box.height > 25 * box.width || box.width > 25 * box.height) {
        contour.delete();
        continue;
      }

      if (
        selection &&
        (box.x < selection.x ||
          box.x + box.width > selection.x + selection.width ||
          box.y < selection.y ||
          box.y + box.height > selection.y + selection.height)
      ) {
        contour.delete();
        continue;
      }

      if (!syllabics.isValidBox(box)) {
        contour.delete();
        continue;
      }

      box.contours = [contour];
      boxes.push(box);
    }
    this.#uiProgress.step(0.5);
    await sleepTick();

    if (!boxes.length) {
      image.delete();
      this.#output.value = "";
      this.#uiProgress.hide();
      this.disabled = false;
      return;
    }

    const meanArea = syllabics.mean(boxes.map((b) => b.height * b.width));
    await sleepTick();

    // Filter out noise by removing boxes below 1% of mean which should be safe
    const filtered = boxes.filter(
      (box) => box.width * box.height > meanArea / 100
    );
    this.#uiProgress.step(0.5);
    await sleepTick();

    const mergedBoxes = syllabics.mergeSyllabicBoxes(filtered);
    this.#uiProgress.step(0.5);
    await sleepTick();
    const lines = syllabics.findLines(filtered);
    this.#uiProgress.step(0.5);
    await sleepTick();
    const grouped = syllabics.groupByLine(mergedBoxes, lines);
    this.#uiProgress.step(0.5);
    await sleepTick();
    const mergedGrouped = syllabics.mergeGroupedSyllabicBoxes(grouped);
    this.#uiProgress.step(0.5);
    await sleepTick();

    lines.forEach((line) => {
      this.#debugCtx.strokeStyle = "red";
      this.#debugCtx.strokeRect(0, line, this.#canvas.width, 1);
    });
    await sleepTick();

    grouped.forEach((line, i) => {
      this.#debugCtx.strokeStyle = i % 2 == 0 ? "green" : "blue";
      line.forEach((box) => {
        this.#debugCtx.strokeRect(box.x, box.y, box.width, box.height);
      });
    });
    this.#uiProgress.step(0.5);
    await sleepTick();

    /**
     * @param {number[]} array
     * @returns
     */
    function argMax(array) {
      let max = array[0];
      let index = 0;

      for (let i = 0; i < array.length; i++) {
        if (array[i] > max) {
          index = i;
          max = array[i];
        }
      }

      return index;
    }

    const finalBoxes = mergedGrouped.flatMap((l) => l);
    await sleepTick();

    const copyImage = cv.imread(this.#canvas);
    this.#uiProgress.step();
    await sleepTick();

    cv.cvtColor(copyImage, copyImage, cv.COLOR_RGBA2GRAY, 0);
    this.#uiProgress.step();
    await sleepTick();

    // Keep current progress position
    const progressScale = (this.#uiProgress.value + 1) / this.#uiProgress.max;
    this.#uiProgress.max = finalBoxes.length * (1 + progressScale);
    this.#uiProgress.value = finalBoxes.length * progressScale;
    let result = "";
    for (let i = 0; i < mergedGrouped.length; i++) {
      const line = mergedGrouped[i];
      let prevX = -1;

      if (result) {
        result += "\n";
      }

      const meanAreaLine = syllabics.mean(line.map((b) => b.height * b.width));
      const medianWidth = syllabics.median(line.map((b) => b.width));
      const meanGap = syllabics.meanGap(line);
      const spaceThreshold = Math.max(medianWidth / 2, meanGap) * 1.5;
      await sleepTick();

      for (let j = 0; j < line.length; j++) {
        const box = line[j];
        const area = box.width * box.height;
        const isDot =
          area < meanAreaLine / 8 &&
          box.height < 2.5 * box.width &&
          box.width < 2.5 * box.height;

        const img = imageUtils.extractBox(copyImage, box);
        await sleepTick();
        const size = img.size();
        const ones = cv.Mat.ones(size.height, size.width, cv.CV_8UC1);
        const input = img.mul(ones, 1 / 255);
        ones.delete();
        await sleepTick();
        const sample = this.#tf.tensor4d(input.data, [1, 42, 42, 1], null);
        const prediction = this.#model.predict(sample).dataSync();
        await sleepTick();
        input.delete();
        img.delete();

        const confidence = prediction[argMax(prediction)];
        const syllabic = isDot ? "ᐧ" : this.#creeClasses[argMax(prediction)];

        // Add spaces if more than spaceThreshold apart
        if (prevX > -1 && box.x - prevX > spaceThreshold) {
          result += "  ";
        }
        prevX = box.x + box.width;

        const map = {
          ᑕ: "ᒼ",
          ᑐ: "ᐣ",
          ᑎ: "ᐢ",
          ᐸ: "ᑉ",
          // ᑕ: "ᑦ",
          ᑲ: "ᒃ",
          ᒐ: "ᒡ",
          ᒪ: "ᒻ",
          ᓇ: "ᓐ",
          ᓴ: "ᔅ",
          ᔕ: "ᔥ",
          ᔭ: "ᔾ",
          ᕋ: "ᕐ",
          ᓚ: "ᓪ",
          ᕙ: "ᕝ",
          ᕦ: "ᕪ",
        };

        // If smaller than mean, then it is likely a final
        if (box.height * box.width < meanAreaLine * 0.7 && syllabic in map) {
          // @ts-ignore
          result += map[syllabic];
        } else {
          result += syllabic;
        }

        this.#uiProgress.step();
      }
    }

    // Cleanup OpenCV memory
    boxes.forEach((box) => {
      box.contours.forEach((contour) => contour.delete());
    });
    contours.delete();
    hierarchy.delete();
    image.delete();
    copyImage.delete();

    this.#output.value = this.#fixOutput(result);
    this.#uiProgress.hide();
    this.disabled = false;
  }

  /**
   * Fixes the output from recognise()
   * @param {string} result
   */
  #fixOutput(result) {
    const dotRightMap = {
      ᐁ: "ᐍ",
      ᐃ: "ᐏ",
      ᐅ: "ᐓ",
      ᐊ: "ᐘ",
      ᐄ: "ᐑ",
      ᐆ: "ᐕ",
      ᐋ: "ᐚ",
    };
    const dotLeftMap = {
      ᐁ: "ᐌ",
      ᐃ: "ᐎ",
      ᐅ: "ᐒ",
      ᐊ: "ᐗ",
      ᐄ: "ᐐ",
      ᐆ: "ᐔ",
      ᐋ: "ᐙ",
    };

    // Treat two ᐤᐤ as the final ᐝ, any others are likely dots but could be
    // finals. Treat as dots if next to a syllabic that accepts a dot or
    // as a final otherwise
    const chars = result.replace(/ᐤᐤ/g, "ᐝ").replace(/ᐤ/g, "ᐧ").split("");
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      if (char === "ᐧ") {
        if (i > 0 && chars[i - 1] in dotRightMap) {
          // @ts-ignore
          chars[i - 1] = dotRightMap[chars[i - 1]];
          chars.splice(i, 1);
          i--;
        } else if (i + 1 < chars.length && chars[i + 1] in dotLeftMap) {
          // @ts-ignore
          chars[i + 1] = dotLeftMap[chars[i + 1]];
          chars.splice(i, 1);
          i--;
        }
      }
    }

    return chars
      .join("")
      .replace(/ᐧ/g, "ᐤ")
      .replace(/[ᑊᐠᐟ]{2}/g, "ᐦ");
  }

  #onRotateRightClick() {
    const src = imageUtils.read(this.#canvas);
    const rotated = imageUtils.rotateClockwise(src);
    imageUtils.write(this.#canvas, rotated);
    src.delete();
    rotated.delete();

    if (!this.#uiSelectArea.disabled) {
      this.#onSelectArea();
    }

    this.#clearSelection();
    this.#syncDimensions();
  }

  #onRotateCounterLeftClick() {
    const src = imageUtils.read(this.#canvas);
    const rotated = imageUtils.rotateCounterClockwise(src);
    imageUtils.write(this.#canvas, rotated);
    src.delete();
    rotated.delete();

    this.#clearSelection();
    this.#syncDimensions();
  }

  /**
   * Removes any selection and disables selection if currently enabled
   */
  #clearSelection() {
    if (!this.#uiSelectArea.disabled) {
      this.#onSelectArea();
    }
  }

  #onSelectArea() {
    // Only enable if there is an image and was previously disabled
    this.#uiSelectArea.disabled =
      !!this.#canvas.width && !this.#uiSelectArea.disabled;

    const textNode = this.#selectAreaButton.lastChild;
    if (!textNode) {
      return;
    }

    textNode.nodeValue = this.#uiSelectArea.disabled
      ? "Select Area"
      : "Clear Selection";
  }
}

customElements.define("ui-main", UIMain);
