#!/bin/sh

freeciv_data="$1"

if test -f "$freeciv_data/default/nations.ruleset"; then
	echo '{"nations":['
	first=1
	for file in $(grep -Eoi 'nation/[^\.]+.ruleset' "$freeciv_data"/default/nations.ruleset); do
		name="$(cat "$freeciv_data/$file"|grep -Ei '^ *name *= *'|awk -F'"' '{print $2}')"
		groups="$(cat "$freeciv_data/$file"|grep -Ei '^ *groups *='|grep -Eoi '\"[^\"]+\"'|tr '\n' ','|sed -re 's/,+$//')"
		leaders="$(cat "$freeciv_data/$file"|sed -re 's/;.*$//'|tr '\n' '|'|grep -Eoi '\bleaders *= *\{[^}]*\}'|tr '|' '\n'|grep -Eoi '"[^"]+" *, *"[^"]+"'|sed -re 's/  +/ /' -e 's/ +$//'|grep -v '^"name", "sex"$'|sed -re 's/^/{"name":/' -e 's/", /", "sex":/' -e 's/$/}/'|tr '\n' ','|sed -re 's/,+$//')"
		if test x$first = x1; then	
			first=0
		else
			echo ','
		fi
		echo '  { "file":"'"$file"'",'
		echo '    "name":"'"$name"'",'
		echo '    "leaders":['"$leaders"'],'
		echo -n '    "groups":['"$groups"']}'
	done
	echo
	echo ']}'
else
	echo 'Not freeciv data directory: '"$freeciv_data" >&2
fi
