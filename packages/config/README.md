# @nodedrop/config

Shared TypeScript, ESLint, and Prettier configurations for NodeDrop monorepo.

## Usage

### TypeScript

**For library packages (types, utils):**
```json
{
  "extends": "@nodedrop/config/tsconfig.library.json",
  "compilerOptions": {
    "baseUrl": "./src"
  }
}
```

**For backend/CLI:**
```json
{
  "extends": "@nodedrop/config/tsconfig.backend.json",
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"]
    }
  }
}
```

**For frontend:**
```json
{
  "extends": "@nodedrop/config/tsconfig.frontend.json",
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"]
    }
  }
}
```

### ESLint

**For backend/CLI/packages:**
```js
// eslint.config.js
import config from '@nodedrop/config/eslint.config.js';
export default config;
```

**For frontend (React):**
```js
// eslint.config.js
import config from '@nodedrop/config/eslint.react.config.js';
export default config;
```

### Prettier

```js
// prettier.config.js
import config from '@nodedrop/config/prettier.config.js';
export default config;
```

Or in package.json:
```json
{
  "prettier": "@nodedrop/config/prettier.config.js"
}
```

## What's Included

- **tsconfig.base.json** - Base TypeScript configuration
- **tsconfig.library.json** - For publishable packages with declarations
- **tsconfig.backend.json** - For backend/CLI with Bun types
- **tsconfig.frontend.json** - For React frontend with DOM types
- **eslint.config.js** - Base ESLint configuration
- **eslint.react.config.js** - ESLint with React rules
- **prettier.config.js** - Prettier code formatting rules
