const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

// Backend API URL
const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://dashboard.pepperwahl.com/' 
  : 'http://localhost:5000';

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api',
  },
}));

// Proxy masked link redirects to backend
app.use('/l', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/l': '/l',
  },
}));

// Serve static files from dist with caching
app.use(express.static(distPath, {
  maxAge: '1y',
  immutable: true,
  index: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// SPA fallback: serve index.html for all non-file routes (except API and /l routes)
app.get('*', (req, res) => {
  // Don't fallback for API and masked link routes
  if (req.path.startsWith('/api') || req.path.startsWith('/l')) {
    return res.status(404).json({ error: 'Route not found' });
  }
  
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
  console.log(`Proxying API requests to: ${BACKEND_URL}`);
});
