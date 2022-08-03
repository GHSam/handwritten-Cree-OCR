/// <reference path="types.d.ts" />

import * as client from "./client.js";
import { UIMain } from "./UIMain.js";
import { UIError } from "./UIError.js";

/**
 * @typedef {import('./syllabics.js').Box} Box
 */
/**
 * @typedef {import('./node_modules/@tensorflow/tfjs/dist/tf.es2017.js')} tfjs
 */
/**
 * @typedef {import('./node_modules/@tensorflow/tfjs/dist/tf.es2017.js').LayersModel} LayersModel
 */

// Show errors in friendly manner
const uiError = new UIError();
document.body.appendChild(uiError);

window.addEventListener("unhandledrejection", (e) => {
  uiError.show(e);
  e.preventDefault();
});

window.addEventListener("error", (e) => {
  uiError.show(e);
  e.preventDefault();
});

// Load required scripts and model
await Promise.all([
  client.loadScript("./libs/opencv.js"),
  client.loadScript("./libs/tf.min.js"),
]);

// @ts-ignore
const tf = /** @type {tfjs} */ (window.tf);

/**
 * @type {LayersModel}
 */
const model = await tf.loadLayersModel("creemodeljs/model.json", {});
const creeClasses = await (await fetch("cree_classes.json")).json();
const loading = client.getElementById("loading", HTMLDivElement);

// Create the main UI and hide loading
document.body.appendChild(new UIMain(creeClasses, model, tf));
document.body.removeChild(loading);
