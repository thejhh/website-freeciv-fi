#!/bin/sh -x
cd "$(dirname $0)"/..
find sessions/ -type f -iname 'sess*.json' -mmin '+480' -delete
