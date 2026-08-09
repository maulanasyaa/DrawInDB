import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Custom plugin to remove crossorigin attribute which breaks file:// protocol in Electron
const removeCrossorigin = () => ({
  name: 'remove-crossorigin',
  transformIndexHtml(html) {
    return html.replace(/crossorigin/g, '');
  }
});

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    removeCrossorigin()
  ],
  base: './', // For Electron compatibility
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false,
    }
  }
});
