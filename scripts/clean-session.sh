#!/bin/sh
find sessions/ -type f -iname 'sess*.json' -mmin '+480' -delete
