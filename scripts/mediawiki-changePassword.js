#!/usr/bin/env node

var mediawiki = require('../src/mediawiki.js'),
    argv = require('optimist')
    .usage('Usage: $0 --username=NAME --password=PW')
    .demand(['username','password'])
    .argv,
    username = argv.username,
    password = argv.password;

if(username && password) {
	mediawiki.changePassword({'username':username, 'password':password}, function(err) {
		if(err) {
			console.log('Failed: ' + err);
			process.exit(1);
		} else {
			console.log('Successfully changed password.');
			process.exit(0);
		}
	});
}

/* EOF */
