import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages deployment: set base to your repository name
  // For root domain, use base: '/'
  // For subpath like /color_pccs/, use base: '/color_pccs/'
  base: process.env.GITHUB_PAGES === 'true' ? '/color_pccs/' : '/',
})

