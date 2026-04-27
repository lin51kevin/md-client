import os from 'os';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// keep track of the `tauri-driver` child process
let tauriDriver;
let exit = false;

export const config = {
  host: '127.0.0.1',
  port: 4444,

  specs: ['./specs/**/*.e2e.js'],
  maxInstances: 1,

  capabilities: [
    {
      maxInstances: 1,
      'tauri:options': {
        application: getBinaryPath(),
      },
    },
  ],

  reporters: ['spec'],
  framework: 'mocha',
  mochaOpts: {
    ui: 'bdd',
    timeout: 60000,
  },

  // Build the Tauri debug binary before running tests
  onPrepare: () => {
    const isWindows = os.platform() === 'win32';
    const cmd = isWindows ? 'yarn.cmd' : 'yarn';
    const result = spawnSync(
      cmd,
      ['tauri', 'build', '--debug', '--no-bundle'],
      {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
        shell: true,
      }
    );
    if (result.status !== 0) {
      throw new Error(`Tauri build failed with exit code ${result.status}`);
    }
  },

  // Start `tauri-driver` before the session
  beforeSession: () => {
    const driverPath = path.resolve(
      os.homedir(),
      '.cargo',
      'bin',
      os.platform() === 'win32' ? 'tauri-driver.exe' : 'tauri-driver'
    );

    // On Windows, pass the native driver path explicitly so tauri-driver can find msedgedriver
    const args = [];
    if (os.platform() === 'win32') {
      const nativeDriver = path.resolve(__dirname, 'msedgedriver.exe');
      args.push('--native-driver', nativeDriver);
    }

    tauriDriver = spawn(driverPath, args, {
      stdio: [null, process.stdout, process.stderr],
    });

    tauriDriver.on('error', (error) => {
      console.error('tauri-driver error:', error);
      process.exit(1);
    });

    tauriDriver.on('exit', (code) => {
      if (!exit) {
        console.error('tauri-driver exited with code:', code);
        process.exit(1);
      }
    });
  },

  // Clean up `tauri-driver` after the session
  afterSession: () => {
    closeTauriDriver();
  },
};

function getBinaryPath() {
  const platform = os.platform();
  const binaryName = platform === 'win32' ? 'marklite.exe' : 'marklite';
  return path.resolve(
    __dirname,
    '..',
    'src-tauri',
    'target',
    'debug',
    binaryName
  );
}

function closeTauriDriver() {
  exit = true;
  tauriDriver?.kill();
}

function onShutdown(fn) {
  const cleanup = () => {
    try {
      fn();
    } finally {
      process.exit();
    }
  };

  process.on('exit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGHUP', cleanup);
  process.on('SIGBREAK', cleanup);
}

// Ensure tauri-driver is closed when our test process exits
onShutdown(() => {
  closeTauriDriver();
});
