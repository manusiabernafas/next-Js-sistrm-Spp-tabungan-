import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // mysql2 dipakai apa adanya di server (tidak dibundel)
  serverExternalPackages: ["mysql2"],
  poweredByHeader: false,
};

export default nextConfig;
