#!/usr/bin/env node

var smf = require('../src/smf.js'),
    core = require('../src/core.js'),
    sys = require('sys'),
    sql = require('../src/sqlmw.js'),
    foreach = require('snippets').foreach,
    argv = require('optimist')
    .usage('Usage: $0 --users')
    .demand(['users'])
    .argv;

function setupUser(user, next) {
	console.log( 'user_id       = ' + sys.inspect(user.user_id) );
	console.log( 'name          = ' + sys.inspect(user.name) );
	console.log( 'realname      = ' + sys.inspect(user.realname) );
	console.log( 'email         = ' + sys.inspect(user.email) );
	console.log( 'password      = ' + sys.inspect(user.password) );
	console.log( 'smf_password  = ' + sys.inspect(user.smf_password) );
	console.log( 'wiki_password = ' + sys.inspect(user.wiki_password) );
	console.log('');
	next();
}

if(argv.users) {
	core.listUsers(function(err, result) {
		if(err) {
			console.log('Error: ' + err);
			return;
		}
		if(!(result && result._rows)) {
			console.log('Error: No results.');
			return;
		}
		var rows = result._rows, actions = [];
		foreach(rows).each(function(row) {
			actions.push(function(state, next) {
				setupUser(row, function(err) {
					if(err) console.log('Error: ' + err);
					next();
				});
			});
		});
		(sql.group.apply(sql, actions))(function(err) {
			if(err) {
				console.log('Error: ' + err);
				process.exit(1);
			} else {
				process.exit(0);
			}
		});
	});
}

/* EOF */
