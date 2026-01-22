# ghpx

Drop-in replacement for `npx` that fixes npm 11's bug with scoped packages from GitHub Package Registry (and other alternative registries).

## Installation

```bash
npm install -g ghpx
```

## Usage

Use exactly like `npx`:

```bash
ghpx <package> [args...]
ghpx -y <package> [args...]
ghpx --package <pkg> -c '<command>'
```

### Examples

```bash
# Scoped packages (uses ghpx caching to work around npm 11 bug)
ghpx @myorg/my-cli --help
ghpx @myorg/my-cli@latest
ghpx @myorg/my-cli@1.2.3 some-command

# Non-scoped packages (passes through to npx)
ghpx cowsay "Hello"
ghpx -y create-react-app my-app
ghpx typescript --version
```

## How It Works

- **Scoped packages** (`@scope/package`): Installs to `~/.ghpx-cache/` and runs the binary directly, bypassing npx's broken registry handling
- **Everything else**: Passes through to `npx` transparently

## Why?

npm 11's `npx` has a bug where it fails to properly handle scoped packages from alternative registries like GitHub Package Registry, even when `.npmrc` is correctly configured. `ghpx` fixes this.

## ghpx-specific Options

```
--ghpx-version      Show ghpx version
--ghpx-clear-cache  Clear cached scoped packages
```

All npm/npx flags work as expected (`--verbose`, `-y`, `--quiet`, etc.).

## Prerequisites

For GitHub Package Registry, your `~/.npmrc` must be configured:

```
@your-scope:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

## License

MIT
