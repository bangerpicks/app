const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');
const path = require('path');
const os = require('os');

const projectRoot = path.join(__dirname, '..');
const devLockFile = path.join(projectRoot, '.dev-server.lock');

function writeDevLock(port) {
  try {
    fs.writeFileSync(
      devLockFile,
      `pid=${process.pid} port=${port}\n`,
      'utf8'
    );
  } catch (error) {
    console.warn('Could not write .dev-server.lock:', error.message);
  }
}

function removeDevLock() {
  try {
    fs.unlinkSync(devLockFile);
  } catch {
    // already removed
  }
}

const DEFAULT_PORT = 3000;
const FALLBACK_PORTS = [3001, 3002, 3003, 3004, 3005];

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '0.0.0.0');
  });
}

async function resolvePort() {
  const envPort = process.env.PORT ? Number(process.env.PORT) : null;
  if (envPort) {
    if (!(await isPortAvailable(envPort))) {
      console.error(
        `\x1b[31mPORT ${envPort} is already in use (set via PORT env). Free it or pick another port.\x1b[0m\n`
      );
      process.exit(1);
    }
    return envPort;
  }

  const candidates = [DEFAULT_PORT, ...FALLBACK_PORTS];
  for (const candidate of candidates) {
    if (await isPortAvailable(candidate)) {
      if (candidate !== DEFAULT_PORT) {
        console.log(
          `\x1b[33m  Note: ${DEFAULT_PORT} is in use — using port ${candidate} instead.\x1b[0m\n`
        );
      }
      return candidate;
    }
  }

  console.error(
    `\x1b[31mNo free port found (tried ${candidates.join(', ')}). Stop other dev servers or set PORT.\x1b[0m\n`
  );
  process.exit(1);
}

async function main() {
  const ip = getLocalIP();
  const port = await resolvePort();

  console.log('\n\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════');
  console.log('\x1b[32m%s\x1b[0m', '  Dev Server Starting...');
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════');
  console.log('\x1b[33m%s\x1b[0m', `  Local:    http://localhost:${port}`);
  console.log('\x1b[33m%s\x1b[0m', `  Network:  http://${ip}:${port}`);
  console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════\n');

  writeDevLock(port);

  // Use the project's installed Next.js (avoid `npx next`, which can fetch a newer major)
  const nextCli = path.join(
    projectRoot,
    'node_modules',
    'next',
    'dist',
    'bin',
    'next'
  );

  const nextDev = spawn(
    process.execPath,
    [nextCli, 'dev', '-H', '0.0.0.0', '-p', String(port)],
    {
      stdio: 'inherit',
      cwd: projectRoot,
      env: { ...process.env, PORT: String(port) },
    }
  );

  nextDev.on('error', (error) => {
    console.error('Error starting dev server:', error);
    process.exit(1);
  });

  const shutdown = (code) => {
    removeDevLock();
    process.exit(code ?? 1);
  };

  nextDev.on('exit', (code) => {
    shutdown(code);
  });

  process.on('SIGINT', () => {
    nextDev.kill('SIGINT');
  });
  process.on('SIGTERM', () => {
    nextDev.kill('SIGTERM');
  });
}

main();