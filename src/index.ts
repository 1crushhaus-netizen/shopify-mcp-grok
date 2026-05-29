import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Required middleware for Render + MCP
app.use(cors());
app.use(express.json());

// Environment variables
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

if (!SHOPIFY_STORE_URL || !SHOPIFY_ACCESS_TOKEN) {
  console.error('❌ Missing SHOPIFY_STORE_URL or SHOPIFY_ACCESS_TOKEN in environment variables');
  process.exit(1);
}

const GRAPHQL_URL = `https://${SHOPIFY_STORE_URL}/admin/api/2025-04/graphql.json`;

// Create MCP Server
const server = new McpServer({
  name: "shopify-admin-mcp",
  version: "1.0.0",
});

// ==================== TOOL 1: get_shop_info ====================
server.registerTool({
  name: "get_shop_info",
  description: "Returns basic information about the Shopify store (name, domain, currency)",
  inputSchema: z.object({}),
  handler: async () => {
    const query = `
      query {
        shop {
          name
          primaryDomain {
            url
          }
          currencyCode
        }
      }
    `;

    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data.data?.shop || data, null, 2) }]
    };
  }
});

// ==================== TOOL 2: search_products ====================
server.registerTool({
  name: "search_products",
  description: "Search products in the store by query string",
  inputSchema: z.object({
    query: z.string().describe("Search query (e.g. 'red shoes', 'wireless headphones')"),
    limit: z.number().min(1).max(50).default(10).describe("Number of products to return (max 50)"),
  }),
  handler: async ({ query, limit }: { query: string; limit: number }) => {
    const gqlQuery = `
      query SearchProducts($query: String!, $limit: Int!) {
        products(first: $limit, query: $query) {
          edges {
            node {
              id
              title
              vendor
              variants(first: 1) {
                nodes {
                  price
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: gqlQuery,
        variables: { query, limit }
      }),
    });

    const data = await response.json();
    return {
      content: [{ type: "text", text: JSON.stringify(data.data?.products || data, null, 2) }]
    };
  }
});

// ==================== SSE TRANSPORT SETUP ====================
app.get('/sse', async (req: Request, res: Response) => {
  console.log('🔌 New SSE connection established');
  const transport = new SSEServerTransport('/messages', req, res);
  await server.connect(transport);
});

app.post('/messages', async (req: Request, res: Response) => {
  const transport = SSEServerTransport.fromRequest(req);
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).json({ error: "No active transport found" });
  }
});

// Health check
app.get('/', (req: Request, res: Response) => {
  res.send('✅ Shopify MCP Server (SSE) is running on Render');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Shopify MCP Server listening on port ${PORT}`);
  console.log(`   SSE endpoint: http://0.0.0.0:${PORT}/sse`);
  console.log(`   Messages endpoint: http://0.0.0.0:${PORT}/messages`);
});