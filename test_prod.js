const { spawn } = require('child_process');

const proc = spawn('npx', ['electron', '.'], { 
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: ['ignore', 'pipe', 'pipe'] 
});

proc.stdout.on('data', (data) => process.stdout.write(data));
proc.stderr.on('data', (data) => process.stderr.write(data));

setTimeout(() => {
  proc.kill();
  process.exit(0);
}, 6000);
