import { spawn } from 'child_process';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

// Start the shopify-mcp CLI in HTTP mode
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

app.get('/', (req, res) => {
  res.send('✅ Shopify MCP Server is running on Render');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});