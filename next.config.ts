import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.openai.com" },
      { protocol: "https", hostname: "medtech.tj" },
      { protocol: "https", hostname: "www.faire-face.fr" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "vector-best.ru" },
      { protocol: "https", hostname: "www.vector-best.ru" },
      { protocol: "https", hostname: "www.deznet.ru" },
      { protocol: "https", hostname: "deznet.ru" },
      // Admin-uploaded product images (common CDNs / hosts)
      { protocol: "https", hostname: "**.cloudinary.com" },
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "i.imgur.com" },
      { protocol: "https", hostname: "i.ibb.co" },
      { protocol: "https", hostname: "**.ibb.co" },
      { protocol: "https", hostname: "postimg.cc" },
      { protocol: "https", hostname: "i.postimg.cc" },
      { protocol: "https", hostname: "files.catbox.moe" },
      { protocol: "https", hostname: "telegra.ph" },
      { protocol: "https", hostname: "drive.google.com" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
      {
        protocol: "https",
        hostname: "ycguhqvuixcwmpqlxjif.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      { protocol: "https", hostname: "threelab.ru" },
      { protocol: "https", hostname: "www.threelab.ru" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:locale/catalog/tl-other",
        destination: "/:locale/catalog/threelab-equipment",
        permanent: true,
      },
    ];
  },
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/.prisma/**/*",
      "./data/admin-products.json",
    ],
  },
};

export default nextConfig;
