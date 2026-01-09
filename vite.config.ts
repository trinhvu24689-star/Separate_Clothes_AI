import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Use (process as any).cwd() to avoid "Property 'cwd' does not exist on type 'Process'" error
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Logic lấy key: Ưu tiên biến môi trường, nếu không có thì dùng key fallback (nếu bạn có)
  // LƯU Ý: Bạn cần set biến môi trường API_KEY trong Settings của Vercel
  const apiKey = env.GEMINI_API_KEY || env.API_KEY || env.VITE_API_KEY || '';
  
  return {
    plugins: [react()],
    define: {
      // Định nghĩa global variable để code client có thể đọc được
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
    build: {
      outDir: 'dist',
    }
  };
});