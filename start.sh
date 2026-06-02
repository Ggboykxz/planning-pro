#!/bin/bash
cd /home/z/my-project

# Kill any existing server
pkill -f "next-server" 2>/dev/null
sleep 2

# Start production server
node ./node_modules/.bin/next start -p 3000 &
SERVER_PID=$!

# Write PID file
echo $SERVER_PID > /home/z/my-project/server.pid

# Wait for server to be ready
for i in $(seq 1 30); do
  if ss -tlnp | grep -q ":3000 "; then
    echo "Server ready on port 3000 (PID: $SERVER_PID)"
    exit 0
  fi
  sleep 1
done

echo "Server failed to start"
exit 1
