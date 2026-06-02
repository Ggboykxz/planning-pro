const { spawn } = require('child_process');
const path = require('path');

const child = spawn('node', [
  path.join(__dirname, 'node_modules/.bin/next'), 
  'start', 
  '-p', '3000'
], {
  cwd: __dirname,
  stdio: 'inherit',
  detached: true
});

child.unref();

// Write PID file
require('fs').writeFileSync('/home/z/my-project/server.pid', child.pid.toString());
console.log('Server PID:', child.pid);
