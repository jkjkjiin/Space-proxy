import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import vitePluginBundleObfuscator from 'vite-plugin-bundle-obfuscator';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const obf = {
  enable: true,
  autoExcludeNodeModules: true,
  threadPool: true,
  options: {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.5,
    deadCodeInjection: false,
    debugProtection: false,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    selfDefending: true,
    simplify: true,
    splitStrings: false,
    stringArray: true,
    stringArrayEncoding: [],
    stringArrayCallsTransform: false,
    transformObjectKeys: false,
    unicodeEscapeSequence: false,
    ignoreImports: true,
  },
};

export default defineConfig({
  plugins: [react(), vitePluginBundleObfuscator(obf)],
  build: {
    esbuild: {
      legalComments: 'none',
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
      },
      output: {
        entryFileNames: '[hash].js',
        chunkFileNames: (chunk) => {
          if (chunk.name === 'vendor-modules') return 'chunks/vendor-modules.js';
          return 'chunks/[hash].js';
        },
        assetFileNames: 'assets/[hash].[ext]',
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor-modules';
        },
      },
    },
  },
  css: {
    modules: {
      generateScopedName: () => {
        return (
          String.fromCharCode(97 + Math.floor(Math.random() * 17)) +
          Math.random().toString(36).substring(2, 8)
        );
      },
    },
  },
  server: {
    proxy: {
      '/': {
        target: '',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/assets\/img/, '/img'),
      },
    },
  },
});
