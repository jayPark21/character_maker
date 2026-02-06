import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/character_maker/', // 노션 임베드 및 GitHub Pages 경로 호환성을 위해 절대 경로로 지정
})
