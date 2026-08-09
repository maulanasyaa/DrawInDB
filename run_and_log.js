const { spawn } = require('child_process');

const proc = spawn('npm', ['run', 'dev'], { stdio: ['ignore', 'pipe', 'pipe'] });

proc.stdout.on('data', (data) => process.stdout.write(data));
proc.stderr.on('data', (data) => process.stderr.write(data));

setTimeout(() => {
  proc.kill();
  process.exit(0);
}, 6000);
