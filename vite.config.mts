/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import solidPlugin from "vite-plugin-solid";

import postcss from "./postcss.config";

export default defineConfig({
  build: {
    sourcemap: true,
  },

  css: {
    postcss,
  },

  plugins: [
    solidPlugin(),
    VitePWA({
      manifest: {
        background_color: "#000000",
        description: "Stardew Valley seasonal planner",
        icons: [
          {
            sizes: "192x192",
            src: "pwa-192x192.png",
            type: "image/png",
          },
          {
            sizes: "512x512",
            src: "pwa-512x512.png",
            type: "image/png",
          },
          {
            purpose: "maskable",
            sizes: "192x192",
            src: "pwa-192x192-maskable.png",
            type: "image/png",
          },
          {
            purpose: "maskable",
            sizes: "512x512",
            src: "pwa-512x512-maskable.png",
            type: "image/png",
          },
        ],
        launch_handler: {
          client_mode: "focus-existing",
        },
        name: "Stardew Valley Seasonal Planner",
        short_name: "SDV Planner",
        theme_color: "#000000",
      },
      registerType: "prompt",
      workbox: {
        // Include all assets in the manifest.webmanifest file
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
      },
    }),
  ],

  server: {
    port: 3000,
  },

  test: {
    environment: "jsdom",
    exclude: ["**/node_modules/**"],
    globals: true,
    setupFiles: ["./src/setupTests.ts"],
  },
});
