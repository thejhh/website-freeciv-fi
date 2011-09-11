#!/usr/bin/env node

/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */

var smf = require('../src/smf.js'),
    mediawiki = require('../src/mediawiki.js'),
    core = require('../src/core.js'),
    sys = require('sys'),
    sql = require('../src/sqlmw.js'),
    foreach = require('snippets').foreach,
    argv = require('optimist')
    .usage('Usage: $0 --users')
    .demand(['users'])
    .argv;

if(argv.users) {
	core.listUsers(function(err, result) {
		if(err) {
			console.log('Error: ' + err);
			process.exit(1);
			return;
		}
		if(!(result && result._rows)) {
			console.log('Error: No results.');
			process.exit(1);
			return;
		}
		var rows = result._rows, actions = [];
		console.log('Preparing actions... rows.length = ' + rows.length);
		foreach(rows).each(function(row) {
			
			if(!row.password) {
				console.log('Skipping user #'+ row.user_id + ' because password is not activated.');
				return;
			}
			
			console.log('Preparing user #' + row.user_id + '...');
			actions.push(function(state, next) {
				console.log('Running user #' + row.user_id + '...');
				core.setupUser(row, function(err) {
					if(err) {
						console.log('Error: ' + err);
					} else {
						console.log('Done #' + row.user_id);
					}
					next();
				});
			});
		});
		console.log('Going to run ' + actions.length + ' users:');
		(sql.group.apply(sql, actions))(function(err) {
			if(err) {
				console.log('Error: ' + err);
				process.exit(1);
			} else {
				console.log('Done ALL.');
				process.exit(0);
			}
		});
	});
}

/* EOF */
