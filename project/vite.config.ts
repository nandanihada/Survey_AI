import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { writeFileSync, readFileSync } from 'fs';

// Plugin to copy index.html to 200.html for Render SPA support
function renderSpaPlugin() {
  return {
    name: 'render-spa-fallback',
    closeBundle() {
      try {
        const indexPath = resolve(__dirname, 'dist', 'index.html');
        const fallbackPath = resolve(__dirname, 'dist', '200.html');
        const content = readFileSync(indexPath, 'utf-8');
        writeFileSync(fallbackPath, content);
        console.log('✅ Created 200.html for Render SPA fallback');
      } catch (e) {
        console.warn('⚠️ Could not create 200.html:', e);
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), renderSpaPlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    'process.env': {},
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Force new file names on each build to bust cache
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}.[ext]`
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
