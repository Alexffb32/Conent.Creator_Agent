import tseslint from 'typescript-eslint';

export default tseslint.config(...tseslint.configs.recommended, {
  rules: {
    'no-restricted-imports': ['error', { patterns: ['next/*', 'react', 'react-dom', 'node:*'] }],
  },
});
