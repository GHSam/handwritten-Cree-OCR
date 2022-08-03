const setImmediateMessageId = "setImmediateMessage";
/**
 * @type {Object<string, function>}
 */
const setImmediateCallbacks = {};
let setImmediateId = 0;

window.addEventListener("message", (e) => {
  const key = e.data;

  if (typeof key == "string" && key.indexOf(setImmediateMessageId) == 0) {
    const id = key.split("-")[1];
    if (id in setImmediateCallbacks) {
      const fn = setImmediateCallbacks[id];
      delete setImmediateCallbacks[id];
      fn();
    }
  }
});

/**
 * Polyfill for setImmediate function using postMessage
 * @param {Function} fn
 * @returns
 */
export function setImmediate(fn) {
  setImmediateId++;
  setImmediateCallbacks[setImmediateId] = fn;

  window.postMessage(`${setImmediateMessageId}-${setImmediateId}`, "*");

  return setImmediateId;
}

/**
 * Clears a callback created using setImmediate
 * @param {number} id
 */
export function clearImmediate(id) {
  delete setImmediateCallbacks[id];
}

/**
 * Sleeps for one tick
 *
 * Can be used to prevent the browser from locking up and allow
 * progress bars to update
 * @returns
 */
export function sleepTick() {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}
