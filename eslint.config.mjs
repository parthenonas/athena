import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
  {
    ignores: [
      "eslint.config.js",
      "eslint.config.mjs",
      "**/dist",
      "**/node_modules",
      "**/coverage"
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    plugins: { prettier },
    rules: {
      "prettier/prettier": "error"
    }
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2022,
      }
    }
  },
  {
    plugins: { import: importPlugin },
    settings: {
      "import/resolver": {
        typescript: {}
      }
    },
    rules: {
      "import/no-self-import": "error",
      "import/no-duplicates": "error",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "import/newline-after-import": ["error", { count: 1 }],
      "@typescript-eslint/no-explicit-any": [
        "error",
        { ignoreRestArgs: true }
      ],
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true }
        }
      ]
    }
  },
  {
    files: ["apps/athena-api/**/*.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "warn",
    }
  },
  {
    files: ["apps/*/src/**/*.ts"],
    languageOptions: {
        parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
        }
    },
    rules: {
        "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }]
    }
  },
  {
  files: ["apps/athena-api/src/main.ts", "apps/*/src/main.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off"
    }
  },
  {
  files: ["**/*.spec.ts", "**/*.test.ts"],
    rules: {
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-explicit-any": "off",
    }
  }
);
