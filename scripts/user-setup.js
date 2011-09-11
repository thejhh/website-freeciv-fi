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

/* Setups the user into external MediaWiki and SMF */
var setupUser = sql.group(
	// Output debug
	function(user, next) {
		console.log( 'user_id       = ' + sys.inspect(user.user_id) );
		console.log( 'name          = ' + sys.inspect(user.name) );
		console.log( 'realname      = ' + sys.inspect(user.realname) );
		console.log( 'email         = ' + sys.inspect(user.email) );
		console.log( 'password      = ' + sys.inspect(user.password) );
		console.log( 'smf_password  = ' + sys.inspect(user.smf_password) );
		console.log( 'wiki_password = ' + sys.inspect(user.wiki_password) );
		console.log('');
		next();
	},
	// Check if this user exists in the MediaWiki (by email) and create account if we can
	function(user, next) {
		mediawiki.getUserByEmail({'user_email': user.email}, function(err, result) {
			if(err) {
				next(err);
				return;
			}
			
			(sql.group(
				// if wiki account exists then update missing information from wiki to core database
				function(result, next) {
					
					// If no wiki account, skip this
					if(!result.user_id) {
						next();
						return;
					}
					
					// If nothing to change, skip this.
					if(!( (!user.name) && result.user_name )) {
						next();
						return;
					}
					
					// Update missing information from wiki to core database
					var fn = sql.query('UPDATE user SET name = :name WHERE user_id = :user_id LIMIT 1'),
						new_name = result.user_name.toLowerCase();
					fn({'user_id':user.user_id, 'name':new_name}, function(err) {
						if(err) {
							next(err);
							return;
						}
						user.name = new_name;
						next();
					});
				},
				// if wiki account missing -- try to create wiki account
				function(result, next) {
					
					// Skip if wiki account exists
					if(result.user_id) {
						next();
						return;
					}
					
					// Try to create wiki account
					var data;
					if(user.email && user.name && user.wiki_password) {
						data = {'email':user.email, 'username':user.name, 'crypted_password':user.wiki_password};
					} else if(user.email && user.name && user.raw_password) {
						data = {'email':user.email, 'username':user.name, 'password':user.raw_password};
					} else {
						// Skip if no data to create account
						next();
						return;
					}
					mediawiki.createUser(data, next);
				}
			))(result, next);
			
		});
	},
	// Check if this user exists in the SMF forum (by email) and create account if we can
	function(user, next) {
		smf.getMemberByEmail({'email_address': user.email}, function(err, result) {
			if(err) {
				next(err);
				return;
			}
			
			// Skip if account exists
			if(result.id_member) {
				next();
				return;
			}
			
			// Try to create new account
			var data;
			if(user.email && user.name && user.smf_password) {
				data = {'email':user.email, 'username':user.name, 'crypted_password':user.smf_password};
			} else if(user.email && user.name && user.raw_password) {
				data = {'email':user.email, 'username':user.name, 'password':user.raw_password};
			} else {
				// Skip if no data to create account
				next();
				return;
			}
			smf.registerMember(data, next);
		});
	}
);

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
		console.log('Preparing actions... rows.length = ' + rows.length);
		foreach(rows).each(function(row) {
			console.log('Preparing user #' + row.user_id + '...');
			actions.push(function(state, next) {
				console.log('Running user #' + row.user_id + '...');
				setupUser(row, function(err) {
					if(err) console.log('Error: ' + err);
					else console.log('Done #' + row.user_id);
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
