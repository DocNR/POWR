// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Add platform-specific extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'web.tsx', 'web.ts', 'web.jsx', 'web.js'];
config.resolver.platforms = ['ios', 'android', 'web'];

module.exports = withNativeWind(config, { input: './global.css' });