import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importX from 'eslint-plugin-import-x';
import stylex from '@stylexjs/eslint-plugin';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'coverage',
      'playwright-report',
      'test-results',
      'docs/design',
      '.claude/skills',
      // Gitignored scratch space for design-tool handoffs (see .gitignore);
      // contains a vendored, minified bundle that is not this project's
      // source and was never meant to be linted.
      'tmp',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    // typescript-eslint's base config sets the TS parser with no `files`
    // restriction, so type-checked rules reach plain JS files too (this repo
    // has exactly one: eslint.config.js itself) even though no parserOptions
    // project covers them. Turn the typed rules back off there instead of
    // giving every JS file a tsconfig project it doesn't need.
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
      'import-x': importX,
      '@stylexjs': stylex,
    },
    // import-x resolves relative imports before `no-restricted-paths` and
    // `no-cycle` can check them, and its bundled resolver only tries
    // .mjs/.cjs/.js/.json/.node extensions. Every extensionless `.ts`/`.tsx`
    // import in this codebase (e.g. `../color/contrast`) then fails to
    // resolve, both rules silently skip it, and lint stays green with no
    // warning that it checked nothing. eslint-import-resolver-node is
    // installed for exactly this: naming it here makes the resolver also
    // try TypeScript's extensions.
    settings: {
      'import-x/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
    rules: {
      // eslint-plugin-react-hooks 7.x renamed its flat-config exports. If
      // `configs.recommended.rules` is undefined at runtime, check what the
      // installed version exports — `configs['recommended-latest']` and
      // `configs.flat.recommended` are the other spellings in circulation —
      // rather than dropping the spread and losing the rules silently.
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'react-refresh/only-export-components': 'warn',

      // These two are the rules that would have caught the prototype's
      // suggestion block: a bare <div> with pointer handlers, no role and no
      // tabIndex — the app's primary interaction, unreachable by keyboard.
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/interactive-supports-focus': 'error',

      // StyleX has no flat-config preset; rules are wired by hand.
      '@stylexjs/valid-styles': 'error',
      '@stylexjs/enforce-extension': 'error',
      '@stylexjs/no-unused': 'error',

      // Layering: model <- color <- session <- features -> ui, app -> features,
      // and nothing imports app.
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            { target: './src/model', from: './src', except: ['./model'] },
            { target: './src/color', from: './src', except: ['./model', './color'] },
            { target: './src/storage', from: './src', except: ['./model', './storage'] },
            { target: './src', from: './src/app', except: ['./app'] },
          ],
        },
      ],
      'import-x/no-cycle': 'error',
    },
  },
  prettier,
);
