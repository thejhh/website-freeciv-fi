#!/bin/sh -x
export NODE_ENV=production
forever -l logs/main.log -o logs/out.log -e logs/err.log src/app.js
