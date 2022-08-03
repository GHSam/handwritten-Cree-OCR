/// <reference path="types.d.ts" />

/**
 * @typedef {Object} CVImage
 * @property {function} delete
 * @property {function(): {width: number; height: number;}} size
 * @property {function(any): CVImage} roi
 */

/**
 * @param {HTMLCanvasElement|HTMLImageElement} canvas
 * @returns {CVImage}
 */
export function read(canvas) {
  return cv.imread(canvas);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {CVImage} image
 */
export function write(canvas, image) {
  cv.imshow(canvas, image);
}

/**
 * Rotates an image 90 degrees
 * @param {CVImage} image
 */
export function rotateClockwise(image) {
  const dest = new cv.Mat();
  cv.rotate(image, dest, cv.ROTATE_90_CLOCKWISE);
  return dest;
}

/**
 * Rotates an image -90 degrees
 * @param {CVImage} image
 */
export function rotateCounterClockwise(image) {
  const dest = new cv.Mat();
  cv.rotate(image, dest, cv.ROTATE_90_COUNTERCLOCKWISE);
  return dest;
}

/**
 * Resizes an image by scale
 * @param {CVImage} image
 * @param {number} scale
 */
export function resize(image, scale) {
  const imageSize = image.size();
  const size = new cv.Size(
    Math.floor(imageSize.width * scale),
    Math.floor(imageSize.height * scale)
  );
  cv.resize(image, image, size, 0, 0, cv.INTER_CUBIC);
}

/**
 *
 * @param {CVImage} image
 * @param {import("./syllabics").Box} box
 */
export function extractBox(image, box) {
  const rectImage = image.roi(box);
  const mask = contoursMask(box);

  cv.threshold(rectImage, rectImage, 100, 255, cv.THRESH_OTSU);

  const rectMasked = new cv.Mat(
    box.height,
    box.width,
    cv.CV_8U,
    new cv.Scalar(255)
  );
  cv.bitwise_and(rectImage, rectImage, rectMasked, mask);

  const scale = Math.min(42 / box.width, 42 / box.height);
  resize(rectMasked, scale);

  const scaledSize = rectMasked.size();
  const finalImage = new cv.Mat();
  const paddingTop = Math.floor((42 - scaledSize.height) / 2);
  const paddingBottom = 42 - scaledSize.height - paddingTop;
  const paddingLeft = Math.floor((42 - scaledSize.width) / 2);
  const paddingRight = 42 - scaledSize.width - paddingLeft;

  cv.copyMakeBorder(
    rectMasked,
    finalImage,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    cv.BORDER_CONSTANT,
    new cv.Scalar(255, 255, 255, 255)
  );

  mask.delete();
  rectMasked.delete();
  rectImage.delete();

  return finalImage;
}

/**
 * Creates a mask based on a boxes contours
 * @param {import("./syllabics").Box} box
 */
export function contoursMask(box) {
  const mask = cv.Mat.zeros(box.height, box.width, cv.CV_8U);
  const color = new cv.Scalar(255);
  // Set to -1 to draw interior of contour
  const thickness = -1;
  const offset = new cv.Point(-box.x, -box.y);
  // Set to negative to draw all contours
  const contourIdx = -1;
  const hierarchy = new cv.Mat();
  const maxLevel = 1000;
  const contours = new cv.MatVector();

  box.contours.forEach((contour) => contours.push_back(contour));

  cv.drawContours(
    mask,
    contours,
    contourIdx,
    color,
    thickness,
    cv.LINE_AA,
    hierarchy,
    maxLevel,
    offset
  );

  contours.delete();
  hierarchy.delete();

  return mask;
}
