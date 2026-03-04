/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow wallet adapter styles from node_modules
  transpilePackages: [
    "@solana/wallet-adapter-react-ui",
  ],
};

module.exports = nextConfig;
