"use client";

import dynamic from "next/dynamic";

const TestConsole =
  process.env.NODE_ENV === "production"
    ? () => null
    : dynamic(() => import("@/components/dev/test-console"), { ssr: false });

const DevTools = () => <TestConsole />;

export default DevTools;
