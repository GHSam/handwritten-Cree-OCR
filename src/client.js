/**
 * Loads a script file asynchronously
 * @param {string} src
 * @returns
 */
export function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script"),
      head = document.head || document.getElementsByTagName("head")[0];
    script.addEventListener("load", resolve);
    script.addEventListener("error", reject);
    script.async = false;
    script.src = src;
    head.insertBefore(script, head.firstChild);
  });
}

/**
 * Type aware getElementById
 *
 * Will verify the element is not null and of the correct type
 * @param {string} id
 * @param {new () => T} type
 * @returns {T}
 * @template T
 */
export function getElementById(id, type) {
  const element = document.getElementById(id);

  if (!element || !(element instanceof type)) {
    throw Error(`Element "${id}" either doesn't exist of is of wrong type.`);
  }

  return element;
}

/**
 * Clones the contents of template and returns the resulting fragment
 * @param {string} id
 * @returns {DocumentFragment}
 */
export function cloneTemplate(id) {
  const template = getElementById(id, HTMLTemplateElement);
  return /** @type{DocumentFragment}*/ (template.content.cloneNode(true));
}

/**
 *
 * @param {Element|null} element
 * @param {new () => T} type
 * @returns {asserts element is T}
 * @template T
 */
export function assertElement(element, type) {
  if (!element || !(element instanceof type)) {
    throw Error(`Element either doesn't exist of is of wrong type.`);
  }
}

/**
 * Loads the passed file into an image and returns when
 * the image is loaded.
 *
 * @param {File} file
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const fileBlob = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(fileBlob);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(fileBlob);
      reject();
    };
    img.src = fileBlob;
  });
}
