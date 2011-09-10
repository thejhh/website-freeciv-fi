/* SMF Database Functions for integration */

var fs = require('fs'),
    sys = require('sys'),
	foreach = require('snippets').foreach,
    sql = require('./sqlmw.js'),
	hash = require('./hash.js'),
    smf = module.exports = {};

smf.dbprefix = 'smf2_';

/* Register member to database */
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
		sql.group( // Note: Sub-group will create a second scope for values so we don't mess original options for INSERT INTO
			sql.connect(),
			sql.query('SELECT id_member FROM '+smf.dbprefix+'members WHERE email_address = :email OR email_address = :username LIMIT 1'),
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

/* EOF */
