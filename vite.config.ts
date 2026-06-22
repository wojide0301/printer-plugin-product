import Uni from '@uni-helper/plugin-uni'
import UniHelperComponents from '@uni-helper/vite-plugin-uni-components'
import UniHelperLayouts from '@uni-helper/vite-plugin-uni-layouts'
import UniHelperManifest from '@uni-helper/vite-plugin-uni-manifest'
import UniHelperPages from '@uni-helper/vite-plugin-uni-pages'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vite'
import { WotResolver } from './src/resolver'
// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  optimizeDeps: {
    exclude: ['@wot-ui/ui'],
  },
  plugins: [
    // https://github.com/uni-helper/vite-plugin-uni-manifest
    UniHelperManifest(),
    // https://github.com/uni-helper/vite-plugin-uni-pages
    UniHelperPages({
      dts: 'src/uni-pages.d.ts',
      /**
       * 排除的页面，相对于 dir 和 subPackages
       * @default []
       */
      exclude: ['**/components/**/*.*'],
    }),
    // https://github.com/uni-helper/vite-plugin-uni-layouts
    UniHelperLayouts(),
    // https://github.com/uni-helper/vite-plugin-uni-components
    UniHelperComponents({
      resolvers: [WotResolver()],
      dts: 'src/components.d.ts',
      dirs: ['src/components'],
      directoryAsNamespace: true,
    }),
    // https://uni-helper.cn/plugin-uni
    Uni(),
    // https://github.com/antfu/unplugin-auto-import
    AutoImport({
      imports: ['vue', '@vueuse/core', 'uni-app', {
        from: '@wot-ui/router',
        imports: ['createRouter', 'useRouter', 'useRoute'],
      }, {
        from: '@wot-ui/ui',
        imports: ['useToast', 'useDialog', 'useNotify', 'CommonUtil'],
      }],
      dts: 'src/auto-imports.d.ts',
      dirs: ['src/composables', 'src/utils'],
      vueTemplate: true,
    }),
    // https://github.com/antfu/unocss
    // see unocss.config.ts for config
    UnoCSS(),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        silenceDeprecations: ['legacy-js-api'],
      },
    },
  },
})
