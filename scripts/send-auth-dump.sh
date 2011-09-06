#!/bin/sh
set -e

database="$1"

test "x$database" != x

echo "UPDATE auth AS a, user AS u SET a.password = u.password WHERE u.password!='' AND a.user_id=u.user_id"|mysql -b

tmpfile="$(tempfile)"

touch "$tmpfile"
chmod 600 "$tmpfile"

mysqldump "$database" --tables auth > "$tmpfile"
cat "$tmpfile"|ssh mars.v2.fi mysql freeciv
rm -f "$tmpfile"
