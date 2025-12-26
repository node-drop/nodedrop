# Migration Guide: Using @nodedrop/config

This guide shows how to migrate each package to use the shared configuration.

## Step 1: Install the config package

The config package is already in your workspace. Run:
```bash
npm install
```

## Step 2: Update each package

### Backend

**backend/tsconfig.json:**
```json
{
  "extends": "@nodedrop/config/tsconfig.backend.json",
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@/types/*": ["types/*"],
      "@/services/*": ["services/*"],
      "@/models/*": ["models/*"],
      "@/utils/*": ["utils/*"],
      "@/middleware/*": ["middleware/*"],
      "@/routes/*": ["routes/*"]
    }
  }
}
```

### Frontend

**frontend/tsconfig.json:**
```json
{
  "extends": "@nodedrop/config/tsconfig.frontend.json",
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@/components/*": ["components/*"],
      "@/pages/*": ["pages/*"],
      "@/hooks/*": ["hooks/*"],
      "@/services/*": ["services/*"],
      "@/types/*": ["types/*"],
      "@/utils/*": ["utils/*"],
      "@/stores/*": ["stores/*"]
    }
  },
  "references": [
    {
      "path": "./tsconfig.node.json"
    }
  ]
}
```

**frontend/tsconfig.node.json:**
```json
{
  "extends": "@nodedrop/config/tsconfig.base.json",
  "compilerOptions": {
    "composite": true
  },
  "include": ["vite.config.ts"]
}
```

### CLI

**cli/tsconfig.json:**
```json
{
  "extends": "@nodedrop/config/tsconfig.backend.json"
}
```

### Packages (types, utils)

**packages/types/tsconfig.json:**
```json
{
  "extends": "@nodedrop/config/tsconfig.library.json"
}
```

**packages/utils/tsconfig.json:**
```json
{
  "extends": "@nodedrop/config/tsconfig.library.json"
}
```

## Step 3: Add ESLint (Optional but Recommended)

### For Backend/CLI/Packages

Create `eslint.config.js`:
```js
import config from '@nodedrop/config/eslint.config.js';
export default config;
```

### For Frontend

Create `eslint.config.js`:
```js
import config from '@nodedrop/config/eslint.react.config.js';
export default config;
```

Update `package.json`:
```json
{
  "scripts": {
    "lint": "eslint ."
  }
}
```

## Step 4: Add Prettier (Optional but Recommended)

Create `prettier.config.js` in each package:
```js
import config from '@nodedrop/config/prettier.config.js';
export default config;
```

Or add to `package.json`:
```json
{
  "prettier": "@nodedrop/config/prettier.config.js",
  "scripts": {
    "format": "prettier --write ."
  }
}
```

## Step 5: Test

After migration, verify everything works:

```bash
# Test TypeScript compilation
cd backend && bun run build
cd frontend && bun run build
cd packages/types && bun run build

# Test linting (if added)
npm run lint

# Test formatting (if added)
npm run format
```

## Benefits After Migration

✅ Single source of truth for configs  
✅ Consistent code style across all packages  
✅ Easier to update - change once, apply everywhere  
✅ Reduced duplication  
✅ Better maintainability
