// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Support .wasm files for expo-sqlite on web
config.resolver.assetExts.push('wasm');

// Support .db files if needed
config.resolver.assetExts.push('db');

module.exports = config;
