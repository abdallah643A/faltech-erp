import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  // lovable-tagger is dev-only and ESM — load dynamically to avoid build issues
  const devPlugins = [];
  if (mode === "development") {
    try {
      const { componentTagger } = await import("lovable-tagger");
      devPlugins.push(componentTagger());
    } catch {
      // gracefully skip if not available
    }
  }

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), ...devPlugins],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      // Raise chunk warning threshold (large ERP is expected)
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          // Split large vendor libraries into separate cached chunks
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-ui": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
              "@radix-ui/react-tooltip",
              "cmdk",
            ],
            "vendor-query": ["@tanstack/react-query"],
            "vendor-charts": ["recharts", "react-is"],
            "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
            "vendor-supabase": ["@supabase/supabase-js"],
            "vendor-date": ["date-fns", "react-day-picker"],
            "vendor-pdf": ["jspdf", "jspdf-autotable", "html2canvas"],
            "vendor-map": ["leaflet", "react-leaflet"],
          },
        },
      },
      target: "es2020",
    },
    // Optimize deps for faster cold starts in dev
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@tanstack/react-query",
        "@supabase/supabase-js",
      ],
    },
  };
});
