#!/usr/bin/env node

var fs = require('fs'),
    sys = require('sys'),
	foreach = require('snippets').foreach,
	config = require('../src/config.js'),
    sql = require('sqlmw')('mysql', config.sql, {'debug':true});

hash = {};

hash.create = function createHash(str, algorithm, encoding) {
	var crypto = require('crypto'),
	    shasum = crypto.createHash(algorithm || 'sha1');
	shasum.update(str);
	return shasum.digest(encoding || 'hex');
};

hash.sha1 = function(str, encoding) {
	return hash.create(str, 'sha1', encoding || 'hex');
};


hash.md5 = function(str, encoding) {
	return hash.create(str, 'md5', encoding || 'hex');
}

var smf = {};

smf.dbprefix = 'smf2_';

smf.registerMember = function registerMember(args, next) {
	
	if(!args.username) throw new TypeError('username required');
	if(!args.email) throw new TypeError('email required');
	if(!args.password) throw new TypeError('password required');
	
	var values = {
			'member_name': args.username,
			'email_address': args.email,
			'passwd': hash.sha1( args.username.strToLowerCase() + args.password ),
			'password_salt': hash.md5(args.username.strToLowerCase() + args.password).substr(0, 4), // AFAIK this isn't even used inside SMF?
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
		keys.push( k);
		placeholders.push( ':' + k);
	});
	
	var insert = sql.group(
		sql.connect(),
		sql.query('SELECT id_member FROM '+smf.dbprefix+'members WHERE email_address = :email OR email_address = :username LIMIT 1'),
		function(state, next) {
			if(state.id_member) {
				next('Member exists already!');
			} else {
				next();
			}
		},
		sql.query('INSERT INTO '+smf.dbprefix+'members (' + keys.join(', ') + ') VALUES (' + placeholders.join(', ') + ')')
	);
	
	insert(values, next);
};

var argv = require('optimist')
    .usage('Usage: $0 --email=EMAIL --username=NAME --password=PW')
    .demand(['email','username','password'])
    .argv;

var email = argv.email,
    username = argv.username,
    password = argv.password;

if(email && username && password) {
	smf.registerMember({'game_id':game_id, 'target_player_number':target_player_number, 'spare_player_number':spare_player_number}, function(err) {
		if(err) {
			console.log('Failed: ' + err);
			process.exit(1);
		} else {
			console.log('Successfully registered.');
			process.exit(0);
		}
	});
}

/* EOF */
