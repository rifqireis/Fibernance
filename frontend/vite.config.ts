import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Tambahkan base secara eksplisit
  base: '/', 
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Ini sangat penting agar Vite tahu asal-usul filenya di domain
    origin: 'https://fibernance.my.id', 
    hmr: {
      clientPort: 443, // Jalur update lewat port HTTPS
    },
    allowedHosts: [
      'fibernance.my.id'
    ]
  }
})