/**
 * @typedef {Object} Box
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {Array<{
 *  delete: () => {}
 * }>} contours
 */

/**
 * Calculates the mean of array of numbers
 * @param {Array<number>} numbers
 * @returns
 */
export function mean(numbers) {
  return numbers.reduce((a, b) => a + b) / numbers.length;
}

/**
 * Calculates the median of array of numbers
 * @param {Array<number>} numbers
 * @returns
 */
export function median(numbers) {
  const sorted = Array.from(numbers).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

/**
 * Calculates the standard deviation for an array of numbers
 * @param {Array<number>} numbers
 * @returns
 */
export function standardDeviation(numbers) {
  const m = mean(numbers);
  return Math.sqrt(
    numbers.map((n) => Math.pow(n - m, 2)).reduce((a, b) => a + b) /
      numbers.length
  );
}

/**
 * Sorts an array of boxes along the y axis
 * @param {Array<Box>} boxes
 */
export function sortBoxes(boxes) {
  boxes.sort((a, b) => {
    if (a.y != b.y) {
      return a.y - b.y;
    }

    return a.x - b.x;
  });
}

/**
 * Merges two bounding boxes into a single box that contains both
 * @param {Box} a
 * @param {Box} b
 * @returns
 */
export function mergeBoxes(a, b) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.max(a.x + a.width, b.x + b.width) - x;
  const height = Math.max(a.y + a.height, b.y + b.height) - y;
  const contours = a.contours.concat(b.contours);

  return { x, y, width, height, contours };
}

/**
 * Checks if a box is valid
 * @param {Box} box
 * @returns
 */
export function isValidBox(box) {
  // Boxes must be able to be scaled to 42x42
  const scale = Math.min(42 / box.width, 42 / box.height);
  return box.width * scale >= 1 && box.height * scale >= 1;
}

/**
 * Checks if a box is contained within the x bounds of the
 * candidate box upto threshold distance outside
 * @param {Box} box
 * @param {Box} candidate
 * @param {number} threshold
 * @returns
 */
export function isBoxWithinX(box, candidate, threshold) {
  const threshStart = candidate.x - threshold;
  const threshEnd = candidate.x + candidate.width + threshold;

  return threshStart <= box.x && threshEnd >= box.x + box.width;
}

/**
 * Merges dots above syllabics into the correct box
 * @param {Array<Box>} boxes
 * @returns
 */
export function mergeSyllabicBoxes(boxes) {
  sortBoxes(boxes);

  const medianArea = median(boxes.map((b) => b.width * b.height));
  const medianWidth = median(boxes.map((b) => b.width));
  const medianHeight = median(boxes.map((b) => b.height));

  const finalBoxes = [];

  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    if (!box) {
      continue;
    }

    const boxArea = box.width * box.height;
    const yMergeThreshold = Math.max(box.height * 3, medianHeight * 0.7);
    const xMergeThreshold = box.width * 1.25;
    let isMerged = false;

    // # If less than 1/8 of median then might be a dot above a syllabic
    // # Should merge if there is a box close below within the merge threshold
    // # or if there is a syllabic left / right within the threshold
    if (boxArea < medianArea / 8 && box.height < 3 * box.width) {
      // # As boxes are sorted top to bottom, left to right, only need to
      // # consider boxes ahead until go beyond the y threshold
      for (let j = i + 1; j < boxes.length; j++) {
        if (!boxes[j]) {
          continue;
        }

        const candidate = boxes[j];
        if (
          candidate.width < medianWidth / 2 &&
          candidate.height < medianHeight / 2
        ) {
          continue;
        }

        if (candidate.y - (box.y + box.height) > yMergeThreshold) {
          break;
        }

        if (isBoxWithinX(box, candidate, xMergeThreshold)) {
          const newBox = mergeBoxes(box, candidate);
          if (isValidBox(newBox)) {
            boxes[j] = newBox;
            isMerged = true;
            break;
          }
        }
      }
    }

    if (!isMerged) {
      finalBoxes.push(box);
    }
  }

  return finalBoxes;
}

/**
 * Merges dots above syllabics into the correct box
 *
 * Similar to mergeSyllabicBoxes() but as the boxes are
 * grouped it can do it without a y threshold allowing some
 * outliers to be grouped.
 * @param {Array<Array<Box>>} lines
 * @returns
 */
export function mergeGroupedSyllabicBoxes(lines) {
  // Copy lines array instead of doing in place modification
  lines = lines.slice(0);

  lines.forEach((line) => {
    const medianArea = median(line.map((b) => b.width * b.height));
    const medianWidth = median(line.map((b) => b.width));
    const medianHeight = median(line.map((b) => b.height));

    for (let i = 0; i < line.length; i++) {
      const box = line[i];
      const boxArea = box.width * box.height;

      // If less than 1/8 of median then might be a dot above a syllabic so
      // merge with anything directly below
      if (boxArea < medianArea / 8 && box.height < 3 * box.width) {
        for (let j = 0; j < line.length; j++) {
          const candidate = line[j];
          if (box === candidate) {
            continue;
          }

          // Must not be lower than the first 25% of a syllabic
          if (candidate.y - (box.y + box.height) < -candidate.height * 0.25) {
            continue;
          }

          if (
            candidate.width < medianWidth / 2 &&
            candidate.height < medianHeight / 2
          ) {
            continue;
          }

          if (isBoxWithinX(box, candidate, box.width * 1.25)) {
            const newBox = mergeBoxes(box, candidate);
            if (isValidBox(newBox)) {
              line[j] = newBox;
              line.splice(i, 1);
              i--;
              break;
            }
          }
        }
      }
    }
  });

  return lines;
}

/**
 * Finds the peaks in a list of numbers
 *
 * Uses a threshold to handle jitter in the data.
 * @param {Array<number>} heatmap
 */
function findPeaks(heatmap) {
  const stdDev = standardDeviation(heatmap);
  const lines = [];
  let isLookingForPeak = false;
  let currentPeak = 0;
  let currentValley = 0;

  for (let i = 0; i < heatmap.length; i++) {
    const current = heatmap[i];

    if (isLookingForPeak) {
      // Stop looking for the peak below threshold
      if (current <= Math.max(0, currentPeak - stdDev)) {
        isLookingForPeak = false;
        currentValley = current;
      }

      if (current > currentPeak) {
        currentPeak = current;
        lines[lines.length - 1] = i;
      }
    } else {
      // Stop looking for the peak if above threshold
      if (current >= currentValley + stdDev) {
        isLookingForPeak = true;
        currentPeak = current;
        lines.push(i);
      }

      if (current < currentValley) {
        currentValley = current;
      }
    }
  }

  return lines;
}

/**
 * Identifies lines based on list of syllabic boxes
 * @param {Array<Box>} boxes
 * @returns
 */
export function findLines(boxes) {
  const height = boxes.reduce((n, box) => Math.max(n, box.y + box.height), 0);
  const heatmap = new Array(height).fill(0);

  boxes.forEach((box) => {
    for (let i = box.y; i < box.y + box.height; i++) {
      heatmap[i] += box.width;
    }
  });

  const lines = findPeaks(heatmap);

  // Remove any lines that are closer than 1/4 of mean distance or
  // 3/4 of mean height.
  // Keeping whichever line is has larger peak value.
  const meanDistance = mean(
    lines.map((position, i) => {
      if (i == 0) {
        return position;
      } else {
        return position - lines[i - 1];
      }
    })
  );

  const meanHeight = mean(boxes.map((box) => box.height));
  const threshold = Math.min(meanDistance / 4, meanHeight * 0.75);

  for (let i = 1; i < lines.length; i++) {
    const lineDistance = lines[i] - (i == 0 ? 0 : lines[i - 1]);

    if (lineDistance <= threshold) {
      if (heatmap[lines[i]] < heatmap[lines[i - 1]]) {
        lines.splice(i, 1);
      } else {
        lines.splice(i - 1, 1);
      }
      i--;
    }
  }

  return lines;
}

/**
 * Groups boxes to their nearest line
 * @param {Array<Box>} boxes
 * @param {Array<number>} lines
 * @returns
 */
export function groupByLine(boxes, lines) {
  // Edge case, no lines detected
  if (!lines.length) {
    return [boxes];
  }

  /** @type{Array<Array<Box>>} */
  const groupings = Array.from(new Array(lines.length), () => []);

  boxes.forEach((box) => {
    const mid = box.y + box.height / 2;
    let lineDistance = Math.abs(lines[0] - mid);
    let line = 0;

    for (let i = 1; i < lines.length; i++) {
      const newDistance = Math.abs(lines[i] - mid);
      if (newDistance > lineDistance) {
        break;
      }

      lineDistance = newDistance;
      line = i;
    }

    groupings[line].push(box);
  });

  // Sort boxes in lines left to right based on the middle point of the boxes
  groupings.forEach((line) =>
    line.sort((a, b) => a.x + a.width / 2 - (b.x + b.width / 2))
  );

  return groupings;
}

/**
 * Calculates the mean gap between boxes
 * @param {Array<Box>} lineBoxes
 */
export function meanGap(lineBoxes) {
  const meanAreaLine = mean(lineBoxes.map((b) => b.height * b.width));
  let totalGap = 0;
  let boxCount = 0;

  for (let i = 1; i < lineBoxes.length; i++) {
    const box = lineBoxes[i];
    const prev = lineBoxes[i - 1];
    const isDot =
      box.width * box.height < meanAreaLine / 8 &&
      box.height < 2.5 * box.width &&
      box.width < 2.5 * box.height;

    // If dot then take whichever gap is larger, next or prev
    if (isDot) {
      const next = lineBoxes[i + 1];
      const prevGap = Math.max(0, box.x - (prev.x + prev.width));
      const nextGap = next ? Math.max(0, next.x - (box.x + box.width)) : 0;

      totalGap += Math.max(prevGap, nextGap);
      // Skip next as dot either belongs to it or previous syllabic, either way
      // the gap has now been accounted for
      i++;
    } else {
      totalGap += Math.max(0, box.x - (prev.x + prev.width));
    }

    boxCount++;
  }

  return totalGap / boxCount;
}
