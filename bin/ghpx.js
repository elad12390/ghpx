#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const VERSION = '1.0.2';

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

function extractNpmFlags(args) {
  const npmFlags = [];
  const remainingArgs = [];
  
  const flagsWithValues = ['-p', '--package', '-c', '--call', '--npm', '--node-arg', '-w', '--workspace', '--loglevel'];
  const standaloneFlags = [
    '-y', '--yes', '-n', '--no', '--no-install', '--ignore-existing',
    '-q', '--quiet', '--silent', '-d', '-dd', '-ddd', '--verbose',
    '--workspaces', '--include-workspace-root'
  ];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (flagsWithValues.includes(arg)) {
      npmFlags.push(arg);
      if (i + 1 < args.length) {
        npmFlags.push(args[++i]);
      }
    } else if (standaloneFlags.includes(arg) || arg.startsWith('--loglevel=')) {
      npmFlags.push(arg);
    } else {
      remainingArgs.push(arg);
    }
  }
  
  return { npmFlags, remainingArgs };
}

function findPackageArg(args) {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('-')) {
      return { index: i, value: arg };
    }
  }
  return null;
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

function installPackage(installDir, packageArg, npmFlags) {
  fs.mkdirSync(installDir, { recursive: true });
  
  const pkgJsonPath = path.join(installDir, 'package.json');
  const pkgJson = {
    name: 'ghpx-temp',
    version: '1.0.0',
    private: true
  };
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
  
  const installFlags = npmFlags.filter(f => 
    f === '--verbose' || f === '-d' || f === '-dd' || f === '-ddd' ||
    f === '-q' || f === '--quiet' || f === '--silent' ||
    f.startsWith('--loglevel')
  );
  
  const cmd = `npm install ${packageArg} ${installFlags.join(' ')}`.trim();
  
  try {
    execSync(cmd, {
      cwd: installDir,
      stdio: 'inherit'
    });
  } catch (error) {
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

function passToNpx(args) {
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const child = spawn(npxCmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
  
  child.on('error', (err) => {
    console.error(`Error executing npx: ${err.message}`);
    process.exit(1);
  });
  
  child.on('close', (code) => {
    process.exit(code || 0);
  });
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    passToNpx(args);
    return;
  }
  
  if (args[0] === '--ghpx-version') {
    console.log(`ghpx v${VERSION}`);
    process.exit(0);
  }
  
  if (args[0] === '--ghpx-clear-cache') {
    clearCache();
    process.exit(0);
  }
  
  const { npmFlags, remainingArgs } = extractNpmFlags(args);
  const packageInfo = findPackageArg(remainingArgs);
  
  if (!packageInfo) {
    passToNpx(args);
    return;
  }
  
  const parsed = parsePackage(packageInfo.value);
  
  if (!parsed) {
    passToNpx(args);
    return;
  }
  
  const { scope, pkgNameWithVersion, binName, fullPackage } = parsed;
  const installDir = getInstallDir(scope, pkgNameWithVersion);
  
  if (needsInstall(installDir, fullPackage)) {
    console.error(`Installing ${fullPackage}...`);
    installPackage(installDir, fullPackage, npmFlags);
  }
  
  const binPath = findBinary(installDir, binName);
  if (!binPath) {
    console.error(`Error: Binary '${binName}' not found`);
    console.error(`Looked in: ${path.join(installDir, 'node_modules', '.bin')}`);
    process.exit(1);
  }
  
  const binaryArgs = remainingArgs.slice(packageInfo.index + 1);
  runBinary(binPath, binaryArgs);
}

main();
