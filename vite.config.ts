import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths(),
  ],
  // Server-side configuration
  ssr: {
    noExternal: ["portkey-ai", "langchain"],
  },
  // Optimize dependencies
  optimizeDeps: {
    exclude: ["fs", "path", "url", "zlib", "http", "https"],
  },
  // Build configuration
  build: {
    rollupOptions: {
      external: ["fs", "path", "url", "zlib", "http", "https", "node:fs/promises"],
    },
  },
  // Add this to ensure environment variables are available
  define: {
    'process.env.PORTKEY_API_KEY': JSON.stringify(process.env.PORTKEY_API_KEY),
    'process.env.OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY),
  },
});