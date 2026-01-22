#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const VERSION = '1.0.0';

function showHelp() {
  console.log(`
ghpx v${VERSION} - npx wrapper for GitHub Package Registry

Usage: ghpx @scope/package-name[@version] [args...]

Works around npm 11's npx bug with scoped packages from alternative registries
(like GitHub Package Registry).

Examples:
  ghpx @myorg/my-cli --help
  ghpx @myorg/my-cli@latest
  ghpx @myorg/my-cli@1.2.3 some-command

Options:
  --help, -h     Show this help message
  --version, -v  Show version
  --clear-cache  Clear all cached packages

Cache location: ~/.ghpx-cache/
`);
}

function showVersion() {
  console.log(`ghpx v${VERSION}`);
}

function getCacheDir() {
  return path.join(os.homedir(), '.ghpx-cache');
}

function clearCache() {
  const cacheDir = getCacheDir();
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log('Cache cleared:', cacheDir);
  } else {
    console.log('Cache directory does not exist:', cacheDir);
  }
}

function parsePackage(packageArg) {
  const match = packageArg.match(/^@([^/]+)\/([^@]+)(@.+)?$/);
  if (!match) {
    return null;
  }
  
  const scope = match[1];
  const pkgNameWithVersion = match[2] + (match[3] || '');
  const binName = match[2];
  
  return { scope, pkgNameWithVersion, binName, fullPackage: packageArg };
}

function getInstallDir(scope, pkgName) {
  const basePkgName = pkgName.replace(/@.*$/, '');
  return path.join(getCacheDir(), scope, basePkgName);
}

function needsInstall(installDir, packageArg) {
  const nodeModulesPath = path.join(installDir, 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    return true;
  }
  
  if (packageArg.includes('@latest')) {
    return true;
  }
  
  return false;
}

function installPackage(installDir, packageArg) {
  fs.mkdirSync(installDir, { recursive: true });
  
  const pkgJsonPath = path.join(installDir, 'package.json');
  const pkgJson = {
    name: 'ghpx-temp',
    version: '1.0.0',
    private: true
  };
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
  
  try {
    execSync(`npm install ${packageArg}`, {
      cwd: installDir,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch (error) {
    console.error(`Error installing ${packageArg}:`);
    console.error(error.stderr?.toString() || error.message);
    process.exit(1);
  }
}

function findBinary(installDir, binName) {
  const binDir = path.join(installDir, 'node_modules', '.bin');
  
  if (process.platform === 'win32') {
    const cmdPath = path.join(binDir, `${binName}.cmd`);
    if (fs.existsSync(cmdPath)) return cmdPath;
  }
  
  const binPath = path.join(binDir, binName);
  if (fs.existsSync(binPath)) return binPath;
  
  return null;
}

function runBinary(binPath, args) {
  const child = spawn(binPath, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  
  child.on('error', (err) => {
    console.error(`Error executing binary: ${err.message}`);
    process.exit(1);
  });
  
  child.on('close', (code) => {
    process.exit(code || 0);
  });
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
  }
  
  if (args[0] === '--version' || args[0] === '-v') {
    showVersion();
    process.exit(0);
  }
  
  if (args[0] === '--clear-cache') {
    clearCache();
    process.exit(0);
  }
  
  const packageArg = args[0];
  const packageArgs = args.slice(1);
  
  const parsed = parsePackage(packageArg);
  if (!parsed) {
    console.error('Error: Package must be scoped (@scope/package-name)');
    console.error('Usage: ghpx @scope/package-name [args...]');
    process.exit(1);
  }
  
  const { scope, pkgNameWithVersion, binName, fullPackage } = parsed;
  const installDir = getInstallDir(scope, pkgNameWithVersion);
  
  if (needsInstall(installDir, fullPackage)) {
    console.error(`Installing ${fullPackage}...`);
    installPackage(installDir, fullPackage);
  }
  
  const binPath = findBinary(installDir, binName);
  if (!binPath) {
    console.error(`Error: Binary '${binName}' not found`);
    console.error(`Looked in: ${path.join(installDir, 'node_modules', '.bin')}`);
    process.exit(1);
  }
  
  runBinary(binPath, packageArgs);
}

main();
