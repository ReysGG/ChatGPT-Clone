import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma client is generated outside the Next.js build root, so make sure
  // server components can resolve `generated/prisma/client` via tsx path mapping.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  // Keep build strict; we don't ship a custom eslint config in this scaffold
  typescript: { ignoreBuildErrors: false },
  // The parent C:\Users\David Boy\Documents\NextJS folder has its own lockfile
  // for other projects. Pin Turbopack's root to this project to silence the warning.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
