import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent clickjacking — disallow embedding in <iframe> from other origins
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Limit referrer information sent to external sites
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable unused browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Basic XSS protection for older browsers
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Force HTTPS in browsers that have visited before (1 year, include subdomains)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

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
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
