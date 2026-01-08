import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // Use the provided API Key if env.API_KEY is not set
  const apiKey = env.API_KEY || 'AIzaSyBfQrr9WM5gfKQwyMhwwW2ScDeRrA3cpxE';
  
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      // Fix process is not defined error in browser
      'process.env': JSON.stringify(env) 
    },
    build: {
      outDir: 'dist',
    }
  };
});