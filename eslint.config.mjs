import antfu from '@antfu/eslint-config';

export default antfu({
  formatters: {
    prettierOptions: {
      semi: true,
      singleQuote: true,
      tabWidth: 2,
      endOfLine: 'lf',
    },
  },
  rules: {
    'style/member-delimiter-style': 'off',
    'no-console': 'warn',
  },
});
