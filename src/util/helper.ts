import { Liquid } from "liquidjs";
import { readFileSync, statSync } from "node:fs";
import { readFile as readFileAsync, stat as statAsync } from "node:fs/promises";
import {
  extname,
  resolve as nodeResolve,
  dirname as nodeDirname,
  sep,
} from "node:path";

const initViewEngine = () => {
  const liquidEngine = new Liquid({
    cache: process.env.ENV?.toUpperCase() === "PROD",
    layouts: "src/resources/view/layout/",
    partials: "src/resources/view/partial/",
    root: "src/resources/view/template/",
    extname: ".liquid",
    fs: {
      async exists(filepath: string) {
        try {
          await statAsync(filepath);
          return true;
        } catch (err) {
          return false;
        }
      },
      existsSync(filepath: string) {
        try {
          statSync(filepath);
          return true;
        } catch (err) {
          return false;
        }
      },
      readFile(filepath: string) {
        return readFileAsync(filepath, "utf-8");
      },
      readFileSync(filepath: string) {
        return readFileSync(filepath, "utf-8");
      },
      resolve(root: string, file: string, ext: string) {
        if (extname(file) !== ".liquid") {
          file += ext;
        }

        return nodeResolve(root, file);
      },
      contains(root: string, file: string) {
        root = nodeResolve(root);
        root = root.endsWith(sep) ? root : root + sep;
        return file.startsWith(root);
      },
      dirname(filepath: string) {
        return nodeDirname(filepath);
      },
      fallback(file: string) {
        const requireResolve = (partial: string) =>
          require.resolve(partial, { paths: ["."] });
        try {
          return requireResolve(file);
        } catch (e) {}
      },
      sep,
    },
  });
  return liquidEngine;
};

export const viewEngine = (() => {
  let instance: Liquid;

  return () => {
    if (!instance) {
      instance = initViewEngine();
    }
    return instance;
  };
})();
