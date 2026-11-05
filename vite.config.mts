import { VitePWA } from "vite-plugin-pwa";
import solidPlugin from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

function lightningcssVersion(major: number, minor = 0) {
  return (major << 16) | (minor << 8);
}

export default defineConfig({
  css: {
    lightningcss: {
      // Same browsers as Vite's default build target ("baseline-widely-available").
      targets: {
        chrome: lightningcssVersion(111),
        edge: lightningcssVersion(111),
        firefox: lightningcssVersion(114),
        ios_saf: lightningcssVersion(16, 4),
        safari: lightningcssVersion(16, 4),
      },
    },
    transformer: "lightningcss",
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
        // The app does not load these images, so they would only waste
        // offline storage.
        globIgnores: [
          "**/node_modules/**/*",
          "images/game/{events,fertilizer,trees}.png",
        ],
        // The farm maps are fetched at runtime, so they must be precached for
        // every farm to work offline.
        globPatterns: [
          "**/*.{js,css,html,ico,png,svg}",
          "data/game/farms/*.json",
        ],
      },
    }),
  ],

  server: {
    port: 3007,
  },

  test: {
    environment: "jsdom",
    exclude: ["**/node_modules/**"],
    globals: true,
  },
});
