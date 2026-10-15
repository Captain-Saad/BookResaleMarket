import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Do not advertise the framework in every response (`X-Powered-By: Next.js`).
  poweredByHeader: false,
  // Stop `next dev` from writing an AGENTS.md file; our agent rules live in CLAUDE.md.
  agentRules: false,
};

export default nextConfig;
