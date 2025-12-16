import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  
  
  
  
  
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.hcaptcha.com https://*.hcaptcha.com https://hcaptcha.com; style-src 'self' 'unsafe-inline' https://*.hcaptcha.com https://hcaptcha.com; img-src 'self' data: https: blob: https://*.hcaptcha.com https://hcaptcha.com; font-src 'self' data: https://*.hcaptcha.com; connect-src 'self' https://hcaptcha.com https://*.hcaptcha.com https://api.hcaptcha.com; frame-src 'self' https://*.hcaptcha.com https://hcaptcha.com; frame-ancestors 'none';",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
