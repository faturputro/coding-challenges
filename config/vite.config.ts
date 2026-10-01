import vue from '@vitejs/plugin-vue'
import path from 'path';
import { defineConfig, splitVendorChunkPlugin } from 'vite'
// import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(__dirname, '..', 'src', 'client');

  return {
    root: rootDir,
    envDir: path.resolve(__dirname, '..'),
    base: '/',
    appType: 'spa',
    server: {
      proxy: {
        '/api': {
          target: `http://localhost:9000`,
          changeOrigin: true,
        },
        // Socket.IO (polling + WebSocket upgrade). Origin is passed through for the server's allowlist.
        '/socket.io': {
          target: `http://localhost:9000`,
          ws: true,
        },
      },
      watch: {
        ignored: ['**/src/server/**'],
      },
    },
    plugins: [
      vue(),
      splitVendorChunkPlugin(),
    ],
    css: {
      postcss: path.resolve(__dirname, 'postcss.config.js'),
    },
    resolve: {
      alias: {
        '@': path.resolve(rootDir),
        '@client': path.resolve(rootDir),
        '@server': path.resolve(__dirname, '..', 'src', 'server'),
      },
    },
    build: {
      outDir: '../../dist/client',
      ssrManifest: true,
      minify: mode === 'production',
      sourcemap: false,
      emptyOutDir: true,
      rollupOptions: {
        output: {
          entryFileNames: 'static/js/[name]-[hash].js',
          chunkFileNames: 'static/js/[name]-[hash].js',
          assetFileNames: 'static/assets/[name]-[hash].[ext]',
        },
      },
    },
    clearScreen: false,
  };
});
