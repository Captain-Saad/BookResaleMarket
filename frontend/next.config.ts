import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(process.env.ENABLE_HSTS === "true"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const API_IMAGE_ORIGIN = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000");
if (!["http:", "https:"].includes(API_IMAGE_ORIGIN.protocol))
  throw new Error("The public API origin must use HTTP or HTTPS");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  headers: async () => [{ source: "/:path*", headers: SECURITY_HEADERS }],
  agentRules: false,
  images: {
    formats: ["image/avif", "image/webp"],
    maximumResponseBody: 5 * 1024 * 1024,
    dangerouslyAllowLocalIP: ["localhost", "127.0.0.1", "[::1]"].includes(
      API_IMAGE_ORIGIN.hostname,
    ),
    remotePatterns: [
      {
        protocol: API_IMAGE_ORIGIN.protocol === "https:" ? "https" : "http",
        hostname: API_IMAGE_ORIGIN.hostname,
        port: API_IMAGE_ORIGIN.port,
        pathname: "/api/v1/listings/*/public-photos/*",
        search: "",
      },
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
        pathname: "/b/id/**",
        search: "",
      },
    ],
  },
};

export default nextConfig;
