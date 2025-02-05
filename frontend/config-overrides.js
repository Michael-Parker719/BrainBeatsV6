const webpack = require('webpack');

module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    process: require.resolve('process/browser.js'), // Add .js extension
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer'),
    fs: false, // Disable fs module
  };

  config.plugins = [
    ...(config.plugins || []),
    new webpack.ProvidePlugin({
      process: 'process/browser.js', // Add .js extension here as well
      Buffer: ['buffer', 'Buffer'],
    }),
  ];

  return config;
};
