const { join } = require("path");
const { NxAppWebpackPlugin } = require("@nx/webpack/app-plugin");

module.exports = {
  output: {
    path: join(__dirname, "dist"),
    filename: "cli.js",
  },

  plugins: [
    new NxAppWebpackPlugin({
      target: "node",
      compiler: "tsc",
      main: "./src/cli.ts",
      tsConfig: "./tsconfig.app.json",
      outputHashing: "none",
      generatePackageJson: false,
      optimization: false,
      sourceMaps: true,
    }),
  ],
};
