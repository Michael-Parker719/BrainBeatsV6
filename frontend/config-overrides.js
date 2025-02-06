const path = require("path");

module.exports = function override(config, env) {
    // Do not include 'fs' and 'crypto' in the bundle
    config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, // Ignore 'fs'
        crypto: false, // Ignore 'crypto'
    };

    return config;
};
