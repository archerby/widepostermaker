#!/usr/bin/env node
import path from 'node:path';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const cliPath = path.resolve('node_modules', 'electron-builder', 'out', 'cli', 'cli.js');
const useNodeCli = existsSync(cliPath);
const command = useNodeCli ? process.execPath : process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = useNodeCli ? [cliPath, 'install-app-deps'] : ['electron-builder', 'install-app-deps'];

const runner = spawn(command, args, {
  stdio: 'inherit',
  env: process.env,
  shell: false
});

runner.on('close', (code) => {
  if (code !== 0) {
    console.error('postinstall failed while installing native dependencies');
    process.exit(code ?? 1);
  }
});
