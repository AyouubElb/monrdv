// One flat config for the whole repo. Each workspace runs `eslint .` and ESLint finds this file.
import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/node_modules/',
    '**/dist/',
    '**/.next/',
    '**/.turbo/',
    '**/coverage/',
    'web/next-env.d.ts',
    'api/src/generated/',
    // Vendored agent skills, not project code.
    '.claude/',
  ]),

  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  {
    files: ['web/**'],
    extends: [nextVitals],
    settings: { next: { rootDir: 'web/' } },
  },
  {
    files: ['api/**', 'shared/**', 'scripts/**', '*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
  // Tenant isolation (spec 0002): services reach business data only through
  // `TenantDb.forBusiness`, never through the raw Prisma client.
  {
    files: ['api/src/**/*.ts'],
    ignores: [
      'api/src/common/prisma/**',
      'api/src/common/tenancy/**',
      'api/src/modules/health/**',
    ],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/prisma/prisma.service*'],
              message:
                'Use TenantDb.forBusiness (api/src/common/tenancy) instead of PrismaService.',
            },
            {
              // Types (Prisma.TransactionClient, model types) stay importable.
              group: ['**/generated/prisma/**'],
              allowTypeImports: true,
              message:
                'Use TenantDb.forBusiness (api/src/common/tenancy) instead of a Prisma client.',
            },
          ],
        },
      ],
    },
  },

  prettier,
]);
