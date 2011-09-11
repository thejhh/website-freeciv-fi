#!/usr/bin/env node

var smf = require('../src/smf.js'),
    core = require('../src/core.js'),
    sys = require('sys'),
    foreach = require('snippets').foreach,
    argv = require('optimist')
    .usage('Usage: $0 --users')
    .demand(['users'])
    .argv;

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
		var rows = result._rows;
		foreach(rows).each(function(row) {
			console.log( 'user_id       = ' + sys.inspect(row.user_id) );
			console.log( 'name          = ' + sys.inspect(row.name) );
			console.log( 'realname      = ' + sys.inspect(row.realname) );
			console.log( 'email         = ' + sys.inspect(row.email) );
			console.log( 'password      = ' + sys.inspect(row.password) );
			console.log( 'smf_password  = ' + sys.inspect(row.smf_password) );
			console.log( 'wiki_password = ' + sys.inspect(row.wiki_password) );
			console.log('');
		});
		process.exit(0);
	});
}

/* EOF */
