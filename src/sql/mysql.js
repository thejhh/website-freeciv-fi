/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */


/**
 * Module dependencies.
 */

var util = require('util'),
    sys = require('sys'),
    foreach = require('snippets').foreach,
    mysql = require('mysql'),
	_rand = require('../rand.js'),
    _lib = module.exports = {},
    _client;

/* */
_lib.config = (function(conf) {
	if(!_client) {
		util.log("sql/mysql.js: Creating mysql client..." );
		_client = mysql.createClient(conf);
	}
	return _lib;
});

/* Insert row to table */
_lib.insert = (function(table, data, callback) {
	try {
		var client = _client, keys=[], values=[], query;
		if(!client) return callback("!client");
		foreach(data).each(function(v, k) {
			if((k === 'password') && (v!='') ) {
				keys.push("`"+k+"` = ENCRYPT(?, ?)");
				values.push(v);
				values.push('$6$' + _rand.string(16) + '$');
			} else {
				keys.push("`"+k+"` = ?");
				values.push(v);
			}
		});
		query = 'INSERT INTO `'+table+'` SET ' + keys.join(', ');
		util.log("Executing query for sql-mysql.js:insert("+sys.inspect(table)+", "+sys.inspect(data)+"): " + query);
		client.query(
			query,
			values,
			function(err, info) {
				var undefined;
				if(err) return callback(err, info && info.insertId, info);
				//util.log("Added email: " + email);
				callback(undefined, info.insertId, info);
			}
		);
	} catch(e) {
		callback(e);
	}
	return _lib;
});

/* Select row(s) from table */
_lib.select = (function(table, options, callback) {
	try {
		var client = _client,
		    options = options || {},
		    what = options.what || ['*'],
		    leftjoin = options.leftjoin || [],
		    keys=[],
		    values=[],
			where = options.where || {},
			limit = options.limit,
			short_table = options.short_table || 't',
		    query;
		if(!client) return callback("!client");
		foreach(options.where).each(function(v, k) {
			keys.push(k);
			values.push(v);
		});
		query = 'SELECT ' + what.join(', ') + ' FROM `'+table+'` AS ' + short_table;
		if(leftjoin.length !== 0) query += ' LEFT JOIN ' + leftjoin.join(' LEFT JOIN ');
		if(keys.length !== 0) query += ' WHERE ' + keys.join(' = ? AND ') + ' = ?';
		if(limit) query += ' LIMIT ' + limit;
		util.log("Executing query for sql-mysql.js:select("+sys.inspect(table)+", "+sys.inspect(options.where)+"): " + query);
		client.query(
			query,
			values,
			function(err, results, fields) {
				return callback(err, results, fields);
			}
		);
	} catch(e) {
		callback(e);
	}
	return _lib;
});

/* Delete row(s) from table */
_lib.del = (function(table, options, callback) {
	try {
		var client = _client,
		    keys=[],
		    values=[],
		    options = options || {},
			where = options.where || {},
			limit = options.limit,
		    query;
		if(!client) return callback("!client");
		foreach(options.where).each(function(v, k) {
			keys.push(k);
			values.push(v);
		});
		query = 'DELETE FROM `'+table+'`';
		if(keys.length !== 0) query += ' WHERE `' + keys.join('` = ? AND `') + '` = ?';
		if(limit) query += ' LIMIT ' + limit;
		util.log("Executing query for sql-mysql.js:delete("+sys.inspect(table)+", "+sys.inspect(options.where)+"): " + query);
		client.query(
			query,
			values,
			function(err, results, fields) {
				return callback(err, results, fields);
			}
		);
	} catch(e) {
		callback(e);
	}
	return _lib;
});

/* Update row(s) from table */
_lib.update = (function(table, options, callback) {
	try {
		var client = _client,
		    options = options || {},
			where = options.where || {},
			what = options.what || {},
			limit = options.limit,
		    where_keys = [],
		    what_keys = [],
		    values = [],
		    query;
		util.log("Updating at sql/mysql.js...");
		if(!client) return callback("!client");
		util.log("Foreach what...");
		foreach(what).each(function(v, k) {
			if((k === 'password') && (v!='') ) {
				what_keys.push("`"+k+"` = ENCRYPT(?, ?)");
				values.push(v);
				values.push('$6$' + _rand.string(16) + '$');
			} else {
				what_keys.push("`"+k+"` = ?");
				values.push(v);
			}
		});
		util.log("Foreach where...");
		foreach(where).each(function(v, k) {
			where_keys.push(k);
			values.push(v);
		});
		util.log("Building query...");
		query = 'UPDATE `'+table+'` SET '+ what_keys.join(', ');
		if(where_keys.length !== 0) query += ' WHERE `' + where_keys.join('` = ? AND `') + '` = ?';
		if(limit) query += ' LIMIT ' + limit;
		util.log("Executing query for sql-mysql.js:update("+sys.inspect(table)+", "+sys.inspect(where)+"): " + query);
		client.query(
			query,
			values,
			function(err) {
				util.log("Query done with err = " + sys.inspect(err) );
				callback(err);
			}
		);
	} catch(e) {
		util.log("Exception catched with " + sys.inspect(e) );
		callback(e);
	}
	return _lib;
});

/* Count table rows */
_lib.count = (function(table, callback) {
	var undefined;
	try {
		var client = _client;
		if(!client) return callback("!client");
		util.log("Executing query for sql-mysql.js:count("+sys.inspect(table)+")...");
		client.query(
			'SELECT COUNT(*) AS count FROM '+table,
			function(err, results, fields) {
				if(err) return callback(err);
				var count = parseInt(results[0].count, 10);
				callback(undefined, count);
			}
		);
	} catch(e) {
		callback(e);
	}
	return _lib;
});

/* Auth check */
_lib.authcheck = (function(table, options, callback) {
	try {
		var client = _client;
		if(!client) return callback("!client");
		var email = options.email,
		    password = options.password,
		    query;
		if(!email) return callback("missing: email");
		if(!password) return callback("missing: password");
		query = 'SELECT COUNT(*) AS count FROM '+table+' WHERE email = ? AND password=ENCRYPT(?, password) LIMIT 1';
		util.log("Executing query for sql-mysql.js:authcheck("+sys.inspect(table)+"): " + sys.inspect(query) );
		client.query(
			query,
			[email, password],
			function(err, results, fields) {
				var undefined, count;
				if(err) return callback("authcheck: "+err);
				if(!results[0]) return callback("authcheck: results missing");
				if(results[0].count) count = parseInt(results[0].count, 10);
				util.log("count = " + count);
				callback(undefined, (count === 1 ? true : false) );
			}
		);
	} catch(e) {
		callback("exception: " + e);
	}
});

/* EOF */
