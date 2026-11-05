const { spawn } = require('child_process');
const http = require('http');

async function waitForServer(port, timeout = 30000) {
  const start = Date.now();
  let lastErr = null;
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/robots.txt`);
      if (res.status === 200 || res.status === 404) return;
    } catch (e) {
      lastErr = e.message;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for server on 127.0.0.1:${port}. Last error: ${lastErr}`);
}

async function run() {
  console.log('Spawning Next.js production server (next start -p 3000 -H 127.0.0.1)...');
  const server = spawn('node', ['./node_modules/next/dist/bin/next', 'start', '-p', '3000', '-H', '127.0.0.1'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: '3000', HOSTNAME: '127.0.0.1' }
  });

  server.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });

  try {
    await waitForServer(3000);
    console.log('Server is responsive on http://localhost:3000.\n');

    const testEnv = { ...process.env, TEST_BASE_URL: 'http://127.0.0.1:3000' };

    console.log('--- RUNNING verify_landing_and_demo.js ---');
    const landingVerify = spawn('node', ['scripts/verify_landing_and_demo.js'], { stdio: 'inherit', env: testEnv });
    await new Promise((resolve) => landingVerify.on('close', resolve));

    console.log('\n--- RUNNING verify_production_endpoints.js ---');
    const verify = spawn('node', ['scripts/verify_production_endpoints.js'], { stdio: 'inherit', env: testEnv });
    await new Promise((resolve) => verify.on('close', resolve));

    console.log('\n--- RUNNING test_phase8_production.js ---');
    const phase8 = spawn('node', ['test_phase8_production.js'], { stdio: 'inherit', env: testEnv });
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
