module.exports = {
  plugins: [
    {
      name: 'preset-default',
      params: {
        overrides: {
          // disable a default plugin
          cleanupIds: {
            remove: false,
            minify: false,
            preserves: ["staff", "g-key", "f-key", "sharp", "flat", "natural", "black-up", "black-down"],
            preservesPrefix: ["ledger"],
          },
        },
      },
    },
    "removeDimensions"
  ],
};
