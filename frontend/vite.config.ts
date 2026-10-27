import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const port = Number(process.env.PORT ?? 8080);

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port,
    strictPort: true,
    hmr: {
      host: "0.0.0.0",
      clientPort: port,
    },
  },
  preview: {
    host: "0.0.0.0",
    port,
    strictPort: true,
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
