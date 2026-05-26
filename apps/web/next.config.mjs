/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@zeromerch/ui", "@zeromerch/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.ainative.studio",
      },
    ],
  },
};

export default nextConfig;
