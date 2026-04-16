#!/bin/sh
# Start nginx in background
nginx -g 'daemon off;' &

# Start Node backend
node server.js
