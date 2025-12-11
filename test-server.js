// Quick test to see the actual error
const { exec } = require('child_process');

const proc = exec('npm run dev', { cwd: __dirname });

proc.stdout.on('data', (data) => {
  console.log(data);
});

proc.stderr.on('data', (data) => {
  console.error(data);
});

setTimeout(() => {
  proc.kill();
  process.exit(0);
}, 5000);
