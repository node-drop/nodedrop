import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler", {}]],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  publicDir: "public", // Serve files from public directory
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React ecosystem - cached long-term
          if (id.includes("node_modules/react/") || 
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/scheduler/")) {
            return "vendor-react";
          }
          
          // Router - separate for route-based caching
          if (id.includes("node_modules/react-router")) {
            return "vendor-router";
          }
          
          // State management
          if (id.includes("node_modules/zustand") || 
              id.includes("node_modules/@tanstack/react-query")) {
            return "vendor-state";
          }
          
          // Flow/canvas - heavy, only needed in workflow editor
          if (id.includes("node_modules/@xyflow") || 
              id.includes("node_modules/@dagrejs") ||
              id.includes("node_modules/d3-")) {
            return "vendor-flow";
          }
          
          // Radix UI primitives
          if (id.includes("node_modules/@radix-ui")) {
            return "vendor-radix";
          }
          
          // Icons - large but compressible
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }
          
          // Forms
          if (id.includes("node_modules/react-hook-form") || 
              id.includes("node_modules/@hookform") ||
              id.includes("node_modules/zod")) {
            return "vendor-forms";
          }
          
          // Markdown rendering
          if (id.includes("node_modules/react-markdown") || 
              id.includes("node_modules/remark") ||
              id.includes("node_modules/rehype") ||
              id.includes("node_modules/unified") ||
              id.includes("node_modules/mdast") ||
              id.includes("node_modules/hast") ||
              id.includes("node_modules/micromark")) {
            return "vendor-markdown";
          }
          
          // HTTP/Socket
          if (id.includes("node_modules/axios") || 
              id.includes("node_modules/socket.io-client")) {
            return "vendor-network";
          }
          
          // Auth
          if (id.includes("node_modules/better-auth")) {
            return "vendor-auth";
          }
          
          // Utilities
          if (id.includes("node_modules/date-fns") ||
              id.includes("node_modules/uuid") ||
              id.includes("node_modules/clsx") ||
              id.includes("node_modules/tailwind-merge") ||
              id.includes("node_modules/class-variance-authority")) {
            return "vendor-utils";
          }
          
          // Sonner/toast
          if (id.includes("node_modules/sonner")) {
            return "vendor-toast";
          }
          
          // Command palette
          if (id.includes("node_modules/cmdk")) {
            return "vendor-cmdk";
          }
        },
      },
    },
  },
});
