import { spawn } from 'child_process';

const PORT = process.env.PORT || 3000;

const mcp = spawn('npx', [
  'shopify-mcp',
  '--clientId', process.env.SHOPIFY_CLIENT_ID,
  '--clientSecret', process.env.SHOPIFY_CLIENT_SECRET,
  '--domain', process.env.SHOPIFY_SHOP_DOMAIN,
  '--port', PORT.toString()
], {
  stdio: 'inherit',
  env: process.env
});

mcp.on('error', (err) => {
  console.error('Failed to start shopify-mcp:', err);
});