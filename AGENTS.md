# AGENTS.md - Coding Agent Guidelines for ghpx

## Project Overview

`ghpx` is a drop-in replacement for `npx` that fixes npm 11's bug with scoped packages from GitHub Package Registry (and other alternative registries).

**Key characteristics:**
- Zero dependencies (Node.js built-ins only)
- Single-file CLI (`bin/ghpx.js`)
- CommonJS module format
- Cross-platform (macOS, Linux, Windows)
- Transparent npx passthrough for non-scoped packages

## Commands

```bash
# Run the CLI locally (development)
node bin/ghpx.js --ghpx-version
node bin/ghpx.js @scope/package-name [args...]

# Test (basic smoke test)
npm test

# Publish to npm (requires npm login)
npm publish

# Pack without publishing (verify contents)
npm pack --dry-run
```

**Note:** No linter, formatter, or test framework is configured. This is intentional for a zero-dependency project.

## Project Structure

```
ghpx/
├── bin/
│   └── ghpx.js      # Main CLI entry point (single file)
├── package.json     # npm package configuration
├── README.md        # User documentation
├── LICENSE          # MIT license
└── .gitignore
```

## Code Style Guidelines

### Module System

- **CommonJS only** - Use `require()` not `import`
- Keep it simple - no transpilation, no build step

```javascript
// Correct
const fs = require('fs');
const { spawn } = require('child_process');

// Wrong - no ES modules
import fs from 'fs';
```

### Dependencies

- **Zero external dependencies** - This is a hard requirement
- Use only Node.js built-in modules: `fs`, `path`, `os`, `child_process`
- Do NOT add npm packages

### Functions

- Use `function` declarations, not arrow functions for top-level functions
- Keep functions small and single-purpose
- Name functions descriptively: `parsePackage`, `findBinary`, `runBinary`

```javascript
// Correct
function parsePackage(packageArg) {
  // ...
}

// Avoid at top level
const parsePackage = (packageArg) => {
  // ...
};
```

### Error Handling

- Use `console.error()` for error messages (goes to stderr)
- Use `console.log()` for normal output (goes to stdout)
- Exit with code 1 on errors, code 0 on success
- Provide helpful error messages with context

```javascript
// Correct
console.error(`Error: Binary '${binName}' not found`);
console.error(`Looked in: ${expectedPath}`);
process.exit(1);

// Wrong - no context
console.log('Error');
process.exit(1);
```

### Variables and Naming

- Use `const` for values that don't change
- Use `let` only when reassignment is needed
- Never use `var`
- camelCase for variables and functions
- UPPER_CASE for constants

```javascript
const VERSION = '1.0.0';
const installDir = getInstallDir(scope, pkgName);
let needsInstall = false;
```

### Strings

- Use template literals for interpolation
- Use single quotes for simple strings

```javascript
// Correct
const message = `Installing ${packageArg}...`;
const name = 'ghpx';

// Avoid
const message = 'Installing ' + packageArg + '...';
```

### Conditionals

- Early return for guard clauses
- Avoid deeply nested if statements

```javascript
// Correct
function parsePackage(packageArg) {
  const match = packageArg.match(/^@([^/]+)\/([^@]+)(@.+)?$/);
  if (!match) {
    return null;
  }
  // ... rest of logic
}

// Avoid
function parsePackage(packageArg) {
  const match = packageArg.match(/^@([^/]+)\/([^@]+)(@.+)?$/);
  if (match) {
    // ... deeply nested logic
  }
  return null;
}
```

### Cross-Platform Compatibility

Always handle Windows differences:

```javascript
// Handle Windows .cmd files
if (process.platform === 'win32') {
  const cmdPath = path.join(binDir, `${binName}.cmd`);
  if (fs.existsSync(cmdPath)) return cmdPath;
}

// Use shell on Windows for spawn
spawn(binPath, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});
```

### CLI Conventions

- ghpx-specific flags use `--ghpx-` prefix to avoid conflicts with npx
- All other flags pass through to npx transparently
- Version format: `ghpx v${VERSION}`

## Versioning

- Update `VERSION` constant in `bin/ghpx.js`
- Update `version` in `package.json`
- Keep them in sync

## Testing Changes

Before committing, manually verify:

```bash
# ghpx version displays correctly
node bin/ghpx.js --ghpx-version

# npx passthrough works (shows npx help)
node bin/ghpx.js --help

# Non-scoped packages pass through to npx
node bin/ghpx.js cowsay "test"

# Cache clear works
node bin/ghpx.js --ghpx-clear-cache
```

## Publishing Checklist

1. Update version in both `bin/ghpx.js` and `package.json`
2. Test locally: `node bin/ghpx.js --ghpx-version`
3. Verify package contents: `npm pack --dry-run`
4. Publish: `npm publish`
5. Verify installation: `npm install -g ghpx && ghpx --ghpx-version`

## Architecture Notes

### npx Wrapper Behavior

- **Scoped packages** (`@scope/package`): Handled by ghpx with caching
- **Everything else**: Passed through to npx transparently

### Cache Strategy

Packages are cached in `~/.ghpx-cache/{scope}/{package-name}/`:
- Uses npm to install into temporary package.json
- Reuses cached packages unless `@latest` is specified
- `--ghpx-clear-cache` removes entire cache directory

### Execution Flow

1. Parse CLI arguments
2. Find first non-flag argument (the package)
3. If scoped package (`@scope/pkg`):
   - Check cache, install if needed
   - Run binary directly
4. If not scoped: pass all args to npx

## What NOT to Do

- Do NOT add external dependencies
- Do NOT convert to TypeScript or ES modules
- Do NOT add complex build tooling
- Do NOT add comments unless absolutely necessary (code should be self-documenting)
- Do NOT suppress errors silently
