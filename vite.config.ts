import { defineConfig } from 'vite';
import mkcert from 'vite-plugin-mkcert';
import react from '@vitejs/plugin-react'; // Ensure this is imported for the react() plugin!

export default defineConfig({
  plugins: [
    react(),
    mkcert() // Add mkcert here alongside react
  ],
  base: "./",
  server: {
    port: 5173,
    strictPort: true,
    cors: true,
    host: true,
    https: true // Required to tell the server to serve over HTTPS
  }
});
