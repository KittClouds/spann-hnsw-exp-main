
import { BunPlugin } from 'bun';
import { join } from 'path';

// Path aliasing plugin
const pathAliasPlugin: BunPlugin = {
  name: 'path-alias',
  setup(build) {
    // Handle @ alias
    build.onResolve({ filter: /^@\// }, (args) => {
      const path = args.path.replace('@/', '');
      return { path: join(import.meta.dir, 'src', path) };
    });
  }
};

export default {
  plugins: [pathAliasPlugin]
};
