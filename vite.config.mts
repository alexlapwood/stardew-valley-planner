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
        // Game data that the app does not use yet. Some of it is large, so it
        // must not go into the offline precache.
        globIgnores: [
          "**/node_modules/**/*",
          "data/game/**",
          "images/game/tilesheets/**",
          "images/game/{buildings,events,fertilizer,trees}.png",
        ],
        // Include all assets in the manifest.webmanifest file
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
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
