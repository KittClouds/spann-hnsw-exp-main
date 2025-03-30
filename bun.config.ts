
import path from "path";
import { componentTagger } from "lovable-tagger";

export default {
  plugins: [
    process.env.NODE_ENV === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./src"),
    },
  },
};
