/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */

/* Database functions for MediaWiki */

var fs = require('fs'),
    sys = require('sys'),
	foreach = require('snippets').foreach,
    sql = require('./sqlmw.js'),
    trim = require('snippets').trim,
	hash = require('./hash.js'),
    mediawiki = module.exports = {};

mediawiki.dbprefix = 'wiki_';

/* Create hashed password (in Mediawiki's B-style) */
mediawiki.createPassword = function(password, salt) {
	salt = salt || hash.createToken(8);
	return ':B:' + salt + ':' + hash.md5( salt + '-' + hash.md5( password ) );
};

/* Default options for new users */
mediawiki.defaultOptions = {
	'quickbar': 1,
	'underline': 2,
	'cols': 80,
	'rows': 25,
	'searchlimit': 20,
	'contextlines': 5,
	'contextchars': 50,
	'disablesuggest': 0,
	'skin': '',
	'math': 1,
	'usenewrc': 0,
	'rcdays': 7,
	'rclimit': 50,
	'wllimit': 250,
	'hideminor': 0,
	'hidepatrolled': 0,
	'newpageshidepatrolled': 0,
	'highlightbroken': 1,
	'stubthreshold': 0,
	'previewontop': 1,
	'previewonfirst': 0,
	'editsection': 1,
	'editsectiononrightclick': 0,
	'editondblclick': 0,
	'editwidth': 0,
	'showtoc': 1,
	'showtoolbar': 1,
	'minordefault': 0,
	'date': 'default',
	'imagesize': 2,
	'thumbsize': 2,
	'rememberpassword': 0,
	'nocache': 0,
	'diffonly': 0,
	'showhiddencats': 0,
	'norollbackdiff': 0,
	'enotifwatchlistpages': 0,
	'enotifusertalkpages': 1,
	'enotifminoredits': 0,
	'enotifrevealaddr': 0,
	'shownumberswatching': 1,
	'fancysig': 0,
	'externaleditor': 0,
	'externaldiff': 0,
	'forceeditsummary': 0,
	'showjumplinks': 1,
	'justify': 0,
	'numberheadings': 0,
	'uselivepreview': 0,
	'watchlistdays': 3,
	'extendwatchlist': 0,
	'watchlisthideminor': 0,
	'watchlisthidebots': 0,
	'watchlisthideown': 0,
	'watchlisthideanons': 0,
	'watchlisthideliu': 0,
	'watchlisthidepatrolled': 0,
	'watchcreations': 0,
	'watchdefault': 0,
	'watchmoves': 0,
	'watchdeletion': 0,
	'noconvertlink': 0,
	'gender': 'unknown',
	'variant': 'fi',
	'language': 'fi',
	'searchNs0': 1
};

/* Encode MediaWiki options */
mediawiki.encodeOptions = function(options) {
	var values = [];
	foreach(options).each(function(v, k) {
		values.push(k+'='+v);
	});
	return values.join('\n');
};

/* Create new user */
mediawiki.createUser = function(args, next) {
	if(!args.username) {
		return next(new TypeError('username required'));
	}
	if(!args.email) {
		return next(new TypeError('email required'));
	}
	if(! (args.password || args.crypted_password) ) {
		return next(new TypeError('password required'));
	}
	
	args.username = trim(''+args.username);
	args.email = trim(''+args.email);
	args.realname = trim(''+ (args.realname||args.username) );
	if(args.password !== undefined) {
		args.password = trim(''+args.password);
		if(args.password.length < 8) {
			return next(new TypeError('password too short!'));
		}
	}
	if(args.username.length.length < 3) {
		return next(new TypeError('username too short!'));
	}
	if(args.email.length < 5) {
		return next(new TypeError('email too short!'));
	}
	if(args.crypted_password === undefined) {
		args.crypted_password = mediawiki.createPassword(args.password);
	}
	
	var wiki_user_name = args.username[0].toUpperCase() + args.username.substr(1),
	    values = {
			'user_name': wiki_user_name,
			'user_password': args.crypted_password,
			'user_newpassword': '',
			'user_email': args.email,
			'user_email_authenticated': new Date(),
			'user_real_name': args.realname,
			'user_options': mediawiki.encodeOptions(mediawiki.defaultOptions),
			//'user_token': mediawiki.getToken(),
			'user_registration': new Date(),
			'user_editcount': 0
		},
	    keys = [],
	    placeholders = [],
		insert;
	
	foreach(values).each(function(v, k) {
		keys.push(k);
		placeholders.push( ':' + k);
	});
	
	insert = sql.group(
		sql.group( // Note: Sub-group will create a second scope for values so we don't mess original options for INSERT INTO
			sql.connect(),
			sql.query('SELECT user_id FROM '+mediawiki.dbprefix+'user WHERE user_name = :user_name OR user_email = :user_email LIMIT 1'),
			function(state, next) {
				if(state.user_id) {
					next('User exists already!');
				} else {
					next();
				}
			}
		),
		sql.query('INSERT INTO '+mediawiki.dbprefix+'user (' + keys.join(', ') + ') VALUES (' + placeholders.join(', ') + ')')
	);
	
	insert(values, next);
};

/* Change user password */
mediawiki.changePassword = function(args, next) {
	if(!args.username) {
		return next(new TypeError('username required'));
	}
	if(! (args.password || args.crypted_password) ) {
		return next(new TypeError('password required'));
	}
	args.username = trim(''+args.username);
	if(args.username.length.length < 3) {
		return next(new TypeError('username too short!'));
	}
	if(args.password !== undefined) {
		args.password = trim(''+args.password);
		if(args.password.length < 8) {
			return next(new TypeError('password too short!'));
		}
	}
	
	if(args.crypted_password === undefined) {
		args.crypted_password = mediawiki.createPassword(args.password);
	}
	
	var wiki_user_name = args.username[0].toUpperCase() + args.username.substr(1),
	    values = {
			'user_name': wiki_user_name,
			'user_password': args.crypted_password
		},
	    update = sql.group(
			sql.connect(),
			sql.query('SELECT user_id FROM '+mediawiki.dbprefix+'user WHERE user_name = :user_name LIMIT 1'),
			function(state, next) {
				if(!state.user_id) {
					next('User does not exist!');
				} else {
					next();
				}
			},
			sql.query('UPDATE '+mediawiki.dbprefix+'user SET user_password = :user_password WHERE user_id = :user_id LIMIT 1')
		);
	
	update(values, next);
};

/* Select user by email */
mediawiki.getUserByEmail = sql.group(sql.connect(), sql.query('SELECT * FROM '+mediawiki.dbprefix+'user WHERE user_email = :user_email LIMIT 1'));

/* EOF */
