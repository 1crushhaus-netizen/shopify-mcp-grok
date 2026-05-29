import { createRemoteServer } from '@tzenderman/shopify-mcp';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

const mcpServer = createRemoteServer({
  shopDomain: process.env.SHOPIFY_SHOP_DOMAIN,
  clientId: process.env.SHOPIFY_CLIENT_ID,
  clientSecret: process.env.SHOPIFY_CLIENT_SECRET,
});

app.use('/mcp', mcpServer);

app.get('/', (req, res) => {
  res.send('✅ Shopify MCP Server is running on Render');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});