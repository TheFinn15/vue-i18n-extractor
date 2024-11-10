import antfu from '@antfu/eslint-config';

export default antfu({
  stylistic: {
    indent: 2,
    quotes: 'single',
    semi: true,
  },
  rules: {
    'style/member-delimiter-style': 'off',
    'no-console': 'warn',
  },
  ignores: ['.eslint.config.*', 'tsconfig.json', 'package.json', 'README.md'],
});
