/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */

/* Core Database Functions for game.freeciv.fi */

var fs = require('fs'),
    sys = require('sys'),
	foreach = require('snippets').foreach,
    sql = require('./sqlmw.js'),
    trim = require('snippets').trim,
	hash = require('./hash.js'),
    smf = require('./smf.js'),
    mediawiki = require('./mediawiki.js'),
    core = module.exports = {};

core.dbprefix = '';

/* List of users */
core.listUsers = sql.group(sql.connect(), sql.query('SELECT * FROM '+core.dbprefix+'user ORDER BY user_id'));

// if raw password exists, update other missing password hashs, too
core.checkPasswords = function(user, next) {
	var changes = {}, sets=[], fn;
	
	// If nothing to do here then skip this
	if(!user.raw_password) {
		next();
		return;
	}
	
	if( (!user.smf_password) && user.name) {
		changes.smf_password = smf.createPassword(user.raw_password, user.name);
		sets.push('smf_password = :smf_password');
	}
	
	if(!user.wiki_password) {
		changes.wiki_password = mediawiki.createPassword(user.raw_password);
		sets.push('wiki_password = :wiki_password');
	}
	
	if( sets.length === 0 ) {
		next();
		return;
	}
	
	// Update missing information from wiki to core database
	fn = sql.query('UPDATE user SET '+sets.join(', ')+' WHERE user_id = :user_id LIMIT 1');
	fn({'user_id':user.user_id, 'smf_password':changes.smf_password, 'wiki_password': changes.wiki_password}, function(err) {
		if(err) {
			next(err);
			return;
		}
		user.smf_password = changes.smf_password;
		user.wiki_password = changes.wiki_password;
		next();
	});
};

/* Setups the user into external MediaWiki and SMF */
core.setupUser = sql.group(
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
	core.checkPasswords,
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
	core.checkPasswords,
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

/* EOF */
