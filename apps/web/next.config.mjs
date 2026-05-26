// Story 13.3 — Bundle analysis + image CDN optimization (Issue #52)
import withBundleAnalyzerFactory from "@next/bundle-analyzer";

const withBundleAnalyzer = withBundleAnalyzerFactory({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@zeromerch/ui", "@zeromerch/shared", "@zeromerch/auth"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.ainative.studio",
      },
      {
        // Printful product image CDN
        protocol: "https",
        hostname: "files.cdn.printful.com",
      },
      {
        // Printify product image CDN
        protocol: "https",
        hostname: "images.printify.com",
      },
    ],
  },
};

export default withBundleAnalyzer(nextConfig);
