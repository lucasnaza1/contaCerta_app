import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
    resolveAlias: {
      // O barrel do pacote reexporta um componente Vue; importamos só o core.
      // (O "exports" do pacote não expõe subpaths, por isso o alias.)
      "@edusites/bancos-brasil/src/core.js":
        "./node_modules/@edusites/bancos-brasil/src/core.js",
    },
  },
};

export default nextConfig;
