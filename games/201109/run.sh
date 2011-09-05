#!/bin/sh -x
set -e

authfile=fc_auth.conf
args="-d 4 -l log/civ.log -R log/rank.log -s saves -P -r game"
fifofile=cli.in

mkdir -p saves log
test -f "$authfile"
test -e default || ln -s ../../share/freeciv-server/share/freeciv/default .
test -e nation || ln -s ../../share/freeciv-server/share/freeciv/nation .
test -e default.serv || ln -s ../../share/freeciv-server/share/freeciv/default.serv .
test -e "$fifofile" || mkfifo "$fifofile"

arg="$1"
case "$arg" in
create)
        tail -f "$fifofile"|civserver $args -N -a "$authfile" >> log/cli.log 2>> log/clierr.log
        ;;
restart=*)
        savegamefile="${arg#restart=}"
        test -f "$savegamefile"
        tail -f "$fifofile"|civserver $args -a "$authfile" -f "$savegamefile" >> log/cli.log 2>> log/clierr.log
        ;;
*)
        echo 'USAGE: run.sh create|restart=file' >&2
        exit 1
        ;;
esac
