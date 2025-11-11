import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images:{
    remotePatterns:[
      {
        protocol:"https",
        // hostname:"**.convex.com",
        hostname:"**.convex.cloud"
      },
    ],
  },
};

export default nextConfig;
