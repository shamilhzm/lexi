// The repo had no linter at all. This one exists mainly for jsx-a11y: the
// accessibility gaps fixed in this pass (unlabelled inputs, a div acting as a
// button, icon-only controls with no name, click handlers with no key handler)
// are all things a linter catches mechanically, and none of them are the kind
// of mistake you notice by reading your own diff.
//
// Deliberately narrow: correctness and a11y, not style. There is no formatter
// here and this isn't trying to be one.
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'scripts/corpus/data'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'jsx-a11y': jsxA11y, 'react-hooks': reactHooks },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // a11y is the reason this config exists, so it fails the build.
      // `label-has-associated-control` is the rule that actually resolves
      // htmlFor↔id; `control-has-associated-label` cannot follow a label to a
      // sibling input and reported four correctly-labelled fields as errors,
      // which is exactly how a team learns to ignore its own linter.
      'jsx-a11y/label-has-associated-control': ['error', { assert: 'either' }],

      // The React Compiler-era hook rules flag long-standing, deliberate
      // patterns here — the ref that tells AnimatePresence which way a graded
      // card should fly, the shuffles seeded inside useMemo, the store's
      // version counter threaded through dependency arrays. They are worth
      // seeing and worth revisiting, but they are not this pass's business and
      // rewriting the session player to satisfy a linter added at the end of it
      // would be a bad trade. Warnings, not errors.
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/exhaustive-deps': 'warn',

      // Style rules that would only add noise to an otherwise clean codebase.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
  {
    // Tests and the Node-side corpus pipeline aren't browser code.
    files: ['**/*.test.ts', '**/*.test.tsx', 'scripts/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
