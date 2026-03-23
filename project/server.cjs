const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

// Always point to the real backend
const BACKEND_URL = process.env.BACKEND_URL || 'https://pepper-dash.onrender.com';

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
}));

// Proxy masked link redirects to backend
app.use('/l', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
}));

// Serve static files
app.use(express.static(distPath, {
  maxAge: '1y',
  immutable: true,
  index: false,
}));

// SPA fallback
app.get('*', (req, res) => {
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