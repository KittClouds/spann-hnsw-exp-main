
import { BunPlugin } from "bun";
import { resolve } from "path";

// A simple plugin to handle path aliases
const aliasPlugin: BunPlugin = {
  name: "alias-plugin",
  setup(build) {
    build.onResolve({ filter: /^@\// }, (args) => {
      const path = args.path.replace(/^@\//, "");
      return { path: resolve(process.cwd(), "src", path) };
    });
  },
};

export default {
  plugins: [aliasPlugin],
  entrypoints: ["./src/main.tsx"],
  outdir: "./dist",
  target: "browser",
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
  },
};
