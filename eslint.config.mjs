import antfu from '@antfu/eslint-config'

export default antfu(
  {
    rules: {
      'style/semi': 'off',
      'style/member-delimiter-style': 'off',
      'no-console': 'warn',
    },
  },
)
