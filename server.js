import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const app = express();
const PORT = process.env.PORT || 3000;

const SHOP_DOMAIN = process.env.SHOPIFY_SHOP_DOMAIN;
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiry - 300000) {
    return accessToken;
  }

  console.log('Requesting new access token...');

  const response = await fetch(`https://${SHOP_DOMAIN}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    })
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error('Token fetch failed:', data);
    throw new Error('Failed to get Shopify access token');
  }

  accessToken = data.access_token;
  tokenExpiry = Date.now() + (23 * 60 * 60 * 1000);
  console.log('Access token obtained successfully');
  return accessToken;
}

const server = new McpServer({
  name: 'shopify-admin-mcp',
  version: '1.0.0'
});

// Tool 1: List Products
server.addTool({
  name: 'list_products',
  description: 'List products from the Shopify store',
  inputSchema: {
    type: 'object',
    properties: {
      first: { type: 'number', description: 'Number of products to return (max 250)' }
    }
  },
  handler: async ({ first = 10 }) => {
    const token = await getAccessToken();
    const query = `{ products(first: ${first}) { edges { node { id title handle status } } } }`;
    const res = await fetch(`https://${SHOP_DOMAIN}/admin/api/2026-01/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
});

// Tool 2: Get Single Product
server.addTool({
  name: 'get_product',
  description: 'Get details of a specific product by ID',
  inputSchema: {
    type: 'object',
    properties: {
      productId: { type: 'string', description: 'Product GID (e.g. gid://shopify/Product/1234567890)' }
    }
  },
  handler: async ({ productId }) => {
    const token = await getAccessToken();
    const query = `{ product(id: \"${productId}\") { id title handle status variants(first: 10) { edges { node { id title price } } } } }`;
    const res = await fetch(`https://${SHOP_DOMAIN}/admin/api/2026-01/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
});

const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => crypto.randomUUID() });

app.post('/mcp', async (req, res) => { await transport.handleRequest(req, res, req.body); });
app.get('/', (req, res) => res.send('✅ Production-ready Shopify Admin MCP Server (OAuth Client Credentials) running on Render'));

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
