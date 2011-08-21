#!/bin/sh -x
forever -l logs/main.log -o logs/out.log -e logs/err.log src/app.js
