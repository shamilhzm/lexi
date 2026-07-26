#!/bin/bash
# Atlas — double-click to launch. Works from any location (Desktop copy is fine).
cd "/Users/shamilhzm/Documents/Claude/Projects/Atlas"
PORT=8766
if ! curl -s -o /dev/null "http://localhost:$PORT"; then
  if [ ! -f app/dist/index.html ]; then (cd app && npm run build); fi
  nohup node scripts/preview-server.mjs app/dist $PORT >/dev/null 2>&1 &
  for i in $(seq 1 20); do curl -s -o /dev/null "http://localhost:$PORT" && break; sleep 0.3; done
fi
open "http://localhost:$PORT"
