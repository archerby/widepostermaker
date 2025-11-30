import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const workspaceRoot = __dirname;
const rendererRoot = path.resolve(workspaceRoot, 'src', 'renderer');
const sharedDir = path.resolve(workspaceRoot, 'src', 'shared');
const sharedDocumentMathPath = path.join(sharedDir, 'documentMath.js');

export default defineConfig({
  root: rendererRoot,
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@shared/documentMath': sharedDocumentMathPath
    }
  },
  optimizeDeps: {
    include: ['@shared/documentMath']
  },
  build: {
    outDir: path.resolve(__dirname, 'dist', 'renderer'),
    emptyOutDir: true,
    commonjsOptions: {
      include: ['node_modules/**', sharedDocumentMathPath]
    }
  },
  server: {
    port: 5173,
    strictPort: true,
    fs: {
      allow: [workspaceRoot, sharedDir]
    }
  }
});
