/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/enfusion_field_kit_beta", destination: "/enfusion-field-kit-beta/index.html?demo=1" },
      // Fleet Console publishes a path-aware build with each successful Pages deployment.
      // Serve it as a standalone document, keeping its React runtime and CSS isolated.
      { source: "/apps/fleet-management", destination: "https://rhs059.github.io/fleet_manager/portfolio/index.html" },
      { source: "/apps/fleet-management/:path+", destination: "https://rhs059.github.io/fleet_manager/portfolio/:path+" },
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
