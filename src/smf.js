/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */

/* SMF Database Functions for integration */

var fs = require('fs'),
    sys = require('sys'),
	foreach = require('snippets').foreach,
    sql = require('./sqlmw.js'),
    trim = require('snippets').trim,
	hash = require('./hash.js'),
    smf = module.exports = {};

smf.dbprefix = 'smf2_';

/* Create hashed password for SMF */
smf.createPassword = function(password, username) {
	return hash.sha1( username.toLowerCase() + password );
};

/* Register new member */
smf.registerMember = function(args, next) {
	
	if(!args.username) {
		return next(new TypeError('username required'));
	}
	if(!args.email) {
		return next(new TypeError('email required'));
	}
	if(!( args.password || args.crypted_password )) {
		return next(new TypeError('password required'));
	}
	
	args.username = trim(''+args.username);
	args.email = trim(''+args.email);
	
	if(args.password !== undefined) {
		args.password = trim(''+args.password);
		if(args.password.length < 8) {
			return next(new TypeError('password too short!'));
		}
	}
	
	if(args.crypted_password === undefined) {
		args.crypted_password = smf.createPassword(args.password, args.username);
	}
	
	if(args.username.length.length < 3) {
		return next(new TypeError('username too short!'));
	}
	if(args.email.length < 5) {
		return next(new TypeError('email too short!'));
	}
	
	var values = {
			'member_name': args.username,
			'email_address': args.email,
			'passwd': args.crypted_password,
			'password_salt': hash.createToken(4), // AFAIK this isn't even used inside SMF?
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
			sql.query('SELECT id_member FROM '+smf.dbprefix+'members WHERE email_address = :email_address OR email_address = :member_name LIMIT 1'),
			function(state, next) {
				if(state.id_member) {
					next('Member exists already!');
				} else {
					next();
				}
			}
		),
		sql.query('INSERT INTO '+smf.dbprefix+'members (' + keys.join(', ') + ') VALUES (' + placeholders.join(', ') + ')')
	);
	
	insert(values, next);
};

/* Change member password */
smf.changePassword = function(args, next) {
	
	if(!args.username) {
		return next(new TypeError('username required'));
	}
	if(!( args.password || args.crypted_password )) {
		return next(new TypeError('password required'));
	}
	
	args.username = trim(''+args.username);
	
	if(args.password !== undefined) {
		args.password = trim(''+args.password);
		if(args.password.length < 8) {
			return next(new TypeError('password too short!'));
		}
	}
	
	if(args.username.length.length < 3) {
		return next(new TypeError('username too short!'));
	}
	
	if(args.crypted_password === undefined) {
		args.crypted_password = smf.createPassword(args.password, args.username);
	}
	
	var values = {
			'member_name': args.username,
			'passwd': args.crypted_password,
			'password_salt': hash.createToken(4) // AFAIK this isn't even used inside SMF?
		},
	    sets = [],
		update;
	
	foreach(['passwd', 'password_salt']).each(function(k) {
		sets.push(k + ' = :' + k);
	});
	
	update = sql.group(
		sql.connect(),
		sql.query('SELECT id_member FROM '+smf.dbprefix+'members WHERE member_name = :member_name LIMIT 1'),
		function(state, next) {
			if(!state.id_member) {
				next('Member does not exist!');
			} else {
				next();
			}
		},
		sql.query('UPDATE '+smf.dbprefix+'members SET ' + sets.join(', ') + ' WHERE id_member = :id_member')
	);
	
	update(values, next);
};

/* Select user by email */
smf.getMemberByEmail = sql.group(sql.connect(), sql.query('SELECT * FROM '+smf.dbprefix+'members WHERE email_address = :email_address LIMIT 1'));

/* EOF */
