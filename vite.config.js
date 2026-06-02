import { defineConfig } from "vite";

export default defineConfig({
  appType: "mpa",
  server: {
    fs: {
      strict: true,
    },
  },
});
