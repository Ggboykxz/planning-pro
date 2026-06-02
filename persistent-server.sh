#!/bin/bash
# Trap signals to prevent immediate death
trap '' SIGHUP SIGPIPE
cd /home/z/my-project
exec ./node_modules/.bin/next dev -p 3000
