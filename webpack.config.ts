import * as path from "path";
import { fileURLToPath } from "url";
import * as webpack from "webpack"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_DEV = true

const config: webpack.Configuration = {
  entry: "./src/index.ts",
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.[vf]s$/i,
        type: "asset/source"
      }
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  mode:IS_DEV ? "development" : "production",
  optimization:{
    minimize: IS_DEV ? false : true
  }
};

export default config;
