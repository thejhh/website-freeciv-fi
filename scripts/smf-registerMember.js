#!/usr/bin/env node

/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */

var smf = require('../src/smf.js'),
    argv = require('optimist')
    .usage('Usage: $0 --email=EMAIL --username=NAME --password=PW')
    .demand(['email','username','password'])
    .argv,
    email = argv.email,
    username = argv.username,
    password = argv.password;

if(email && username && password) {
	smf.registerMember({'email':email, 'username':username, 'password':password}, function(err) {
		if(err) {
			console.log('Failed: ' + err);
			process.exit(1);
		} else {
			console.log('Successfully registered new user.');
			process.exit(0);
		}
	});
}

/* EOF */
