"use strict";

const { readFileSync } = require("node:fs");
const { imageSize: readDimensions } = require("image-size-patched");

// SDK 54 Metro uses both buffers and synchronous filenames. image-size 2.x
// accepts buffers, so adapt only that legacy filename API; all parsing runs
// through the patched upstream package.
function imageSize(input) {
  return readDimensions(typeof input === "string" ? readFileSync(input) : input);
}

module.exports = imageSize;
module.exports.imageSize = imageSize;
module.exports.default = imageSize;
