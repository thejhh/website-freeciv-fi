#!/bin/sh

now="$(date +%s)"
next="$(date -d '2011-09-08 20:00' +%s)"

echo "/set timeout $(echo "$next - $now"|calc -p)"
