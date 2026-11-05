const { spawn } = require('child_process');
const http = require('http');

function waitForServer(port, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function tryConnect() {
      const req = http.get(`http://localhost:${port}/api/robots.txt`, (res) => {
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error('Timeout waiting for server'));
        } else {
          setTimeout(tryConnect, 500);
        }
      });
      req.end();
    }
    tryConnect();
  });
}

async function run() {
  console.log('Spawning Next.js production server (next start -p 3000)...');
  const server = spawn('node', ['./node_modules/next/dist/bin/next', 'start', '-p', '3000'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: '3000' }
  });

  server.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

  try {
    await waitForServer(3000);
    console.log('Server is responsive on http://localhost:3000.\n');

    console.log('--- RUNNING verify_production_endpoints.js ---');
    const verify = spawn('node', ['scripts/verify_production_endpoints.js'], { stdio: 'inherit' });
    await new Promise((resolve) => verify.on('close', resolve));

    console.log('\n--- RUNNING test_phase8_production.js ---');
    const phase8 = spawn('node', ['test_phase8_production.js'], { stdio: 'inherit' });
    await new Promise((resolve) => phase8.on('close', resolve));
  } finally {
    console.log('\nStopping Next.js server...');
    server.kill();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
