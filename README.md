# ghpx

npx wrapper for GitHub Package Registry - works around npm 11's npx bug with scoped packages from alternative registries.

## Installation

```bash
npm install -g ghpx
```

## Usage

```bash
ghpx @scope/package-name [args...]
```

### Examples

```bash
ghpx @myorg/my-cli --help
ghpx @myorg/my-cli@latest
ghpx @myorg/my-cli@1.2.3 some-command
```

## Why?

npm 11's `npx` has a bug where it fails to properly handle scoped packages from alternative registries like GitHub Package Registry, even when `.npmrc` is correctly configured.

`ghpx` works around this by:
1. Caching packages in `~/.ghpx-cache/`
2. Using your existing `~/.npmrc` for registry authentication
3. Running the package binary like `npx` would

## Options

```
--help, -h     Show help message
--version, -v  Show version
--clear-cache  Clear all cached packages
```

## Prerequisites

Your `~/.npmrc` must be configured for GitHub Package Registry:

```
@your-scope:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

## License

MIT
