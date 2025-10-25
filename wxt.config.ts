import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'lifefi',
    description: 'AI - LifeFi',
    permissions: [
      'storage'
    ],
    host_permissions: [
      '<all_urls>'
    ],
    web_accessible_resources: [
      {
        resources: [
          'asoul/**/*.png',
          'asoul/**/*.gif',
          'asoul/*.png'
        ],
        matches: ['<all_urls>']
      }
    ]
  },
  // 开发模式保留 console 日志
  vite: (env) => ({
    esbuild: env.mode === 'production' ? {
      // 仅生产构建时移除 console 和 debugger
      drop: ['console', 'debugger'],
      pure: ['console.log', 'console.info', 'console.debug', 'console.warn'],
    } : {}
  })
});
