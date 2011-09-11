/* Database functions for MediaWiki */

var fs = require('fs'),
    sys = require('sys'),
	foreach = require('snippets').foreach,
    sql = require('./sqlmw.js'),
    trim = require('snippets').trim,
	hash = require('./hash.js'),
    mediawiki = module.exports = {};

mediawiki.dbprefix = 'smf2_';

/* Create hashed password (in Mediawiki's B-style) */
mediawiki.createPassword = function(password, salt) {
	salt = salt || hash.createToken(8);
	return ':B:' + salt + ':' + hash.md5( salt + '-' + hash.md5( args.password ) );
};

/* Register new user */
mediawiki.registerUser = function(args, next) {
	/*
	if(!args.username) throw new TypeError('username required');
	if(!args.email) throw new TypeError('email required');
	if(!args.password) throw new TypeError('password required');
	
	args.username = trim(''+args.username);
	args.email = trim(''+args.email);
	args.password = trim(''+args.password);
	
	if(args.username.length.length < 3) throw new TypeError('username too short!');
	if(args.email.length < 5) throw new TypeError('email too short!');
	if(args.password.length < 8) throw new TypeError('password too short!');
	
	var values = {
		'member_name': args.username,
		'email_address': args.email,
		'passwd': hash.sha1( args.username.toLowerCase() + args.password ),
		'password_salt': hash.md5(args.username.toLowerCase() + args.password).substr(0, 4), // AFAIK this isn't even used inside SMF?
		'posts': 0,
		'date_registered': new Date(),
		'member_ip': args.member_ip || '127.0.0.1',
		'member_ip2': args.member_ip2 || '127.0.0.1',
		'validation_code': '',
		'real_name': args.username,
		'personal_text': '',
		'pm_email_notify': 1,
		'id_theme': 0,
		'id_post_group': 4,
		'lngfile': '',
		'buddy_list': '',
		'pm_ignore_list': '',
		'message_labels': '',
		'website_title': '',
		'website_url': '',
		'location': '',
		'icq': '',
		'aim': '',
		'yim': '',
		'msn': '',
		'time_format': '',
		'signature': '',
		'avatar': '',
		'usertitle': '',
		'secret_question': '',
		'secret_answer': '',
		'additional_groups': '',
		'ignore_boards': '',
		'smiley_set': '',
		'openid_uri': ''
	};
	
	var keys = [],
	    placeholders = [];
	foreach(values).each(function(v, k) {
		keys.push(k);
		placeholders.push( ':' + k);
	});
	
	var insert = sql.group(
		sql.group( // Note: Sub-group will create a second scope for values so we don't mess original options for INSERT INTO
			sql.connect(),
			sql.query('SELECT id_member FROM '+smf.dbprefix+'members WHERE email_address = :email_address OR email_address = :member_name LIMIT 1'),
			function(state, next) {
				if(state.id_member) {
					next('Member exists already!');
				} else {
					next();
				}
			}
		),
		sql.query('INSERT INTO '+mediawiki.dbprefix+'members (' + keys.join(', ') + ') VALUES (' + placeholders.join(', ') + ')')
	);
	
	insert(values, next);
	*/
};

/* Change user password */
mediawiki.changePassword = function(args, next) {
	if(!args.username) throw new TypeError('username required');
	if(!args.password) throw new TypeError('password required');
	
	args.username = trim(''+args.username);
	args.password = trim(''+args.password);
	
	if(args.username.length.length < 3) throw new TypeError('username too short!');
	if(args.password.length < 8) throw new TypeError('password too short!');
	
	var values = {
		'user_name': args.username,
		'user_password': mediawiki.createPassword(args.password)
	};
	
	var update = sql.group(
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

/* EOF */
