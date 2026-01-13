const { execSync, spawn } = require('child_process');
const os = require('os');

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

const ip = getLocalIP();
const port = process.env.PORT || 3000;

console.log('\n\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════');
console.log('\x1b[32m%s\x1b[0m', '  Dev Server Starting...');
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════');
console.log('\x1b[33m%s\x1b[0m', `  Local:    http://localhost:${port}`);
console.log('\x1b[33m%s\x1b[0m', `  Network:  http://${ip}:${port}`);
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════\n');

// Spawn the Next.js dev server
const nextDev = spawn('npx', ['next', 'dev', '-H', '0.0.0.0'], {
  stdio: 'inherit',
  shell: true
});

nextDev.on('error', (error) => {
  console.error('Error starting dev server:', error);
  process.exit(1);
});

nextDev.on('exit', (code) => {
  process.exit(code);
});
