import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { shopifyTools } from '@tzenderman/shopify-mcp';

const app = express();
const PORT = process.env.PORT || 3000;

const server = new McpServer({
  name: "shopify-mcp",
  version: "1.0.0",
});

// Add Shopify tools
server.addTools(shopifyTools({
  shopDomain: process.env.SHOPIFY_SHOP_DOMAIN,
  clientId: process.env.SHOPIFY_CLIENT_ID,
  clientSecret: process.env.SHOPIFY_CLIENT_SECRET,
}));

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => crypto.randomUUID(),
});

app.post('/mcp', async (req, res) => {
  await transport.handleRequest(req, res, req.body);
});

app.get('/', (req, res) => {
  res.send('✅ Shopify MCP Server is running on Render');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});