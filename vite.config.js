import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const prodFlag = mode === "prod";

  return {
    appType: "mpa",
    define: {
      __PROD_OVERRIDE__: prodFlag,
    },
    server: {
      fs: {
        strict: true,
      },
    },
  };
});
