// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    tooling: true,
    stylistic: {
      indent: 2,
      quotes: 'single',
      semi: false,
      commaDangle: 'never',
      braceStyle: '1tbs',
      arrowParens: false
    }
  },
  dirs: {
    src: [
      './playground'
    ]
  }
}).append({
  files: ['playground/**'],
  rules: {
    'vue/multi-word-component-names': 'off'
  }
})
