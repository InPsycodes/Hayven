import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  // Lets the dev server's hot-reload/dev-tooling connections work when
  // testing from a phone on the same network (http://<lan-ip>:3000) instead
  // of localhost -- without this, Next blocks that connection by default,
  // which can leave the dev-mode client runtime partially broken on that
  // device (some interactions silently fail while others still work).
  allowedDevOrigins: ["192.168.8.133"],
};

export default withSerwist(nextConfig);
