const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const config = getDefaultConfig(__dirname);
const defaultBlockList = config.resolver.blockList;
const generatedDirectories = ["coverage", "qa-artifacts"].map((directory) => {
  const absolutePath = path.join(__dirname, directory).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${absolutePath}(?:[/\\\\].*)?$`);
});

// Generated reports can be replaced while Metro is watching on Windows.
config.resolver.blockList = [
  ...(Array.isArray(defaultBlockList) ? defaultBlockList : defaultBlockList ? [defaultBlockList] : []),
  ...generatedDirectories
];

module.exports = config;
