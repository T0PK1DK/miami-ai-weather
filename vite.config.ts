import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api/nws": {
        target: "https://api.weather.gov",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nws/, ""),
        headers: {
          "User-Agent": "miami-ai-weather (https://github.com/T0PK1DK/miami-ai-weather)",
          Accept: "application/geo+json"
        }
      },
      "/api/nhc": {
        target: "https://www.nhc.noaa.gov",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/nhc/, "")
      }
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.js"]
  }
});
