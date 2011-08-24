
/**
 * Module dependencies.
 */

var util = require('util'),
    sys = require('sys'),
    foreach = require('snippets').foreach,
    mysql = require('mysql'),
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
		var client = _client, where_keys=[], values=[], query;
		if(!client) return callback("!client");
		foreach(data).do(function(v, k) {
			keys.push(k);
			values.push(v);
		});
		query = 'INSERT INTO `'+table+'` SET `' + keys.join('` = ?, `') + '` = ?';
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
		    keys=[],
		    values=[],
		    options = options || {},
			where = options.where || {},
			limit = options.limit,
		    query;
		if(!client) return callback("!client");
		foreach(options.where).do(function(v, k) {
			keys.push(k);
			values.push(v);
		});
		query = 'SELECT * FROM `'+table+'`';
		if(keys.length !== 0) query += ' WHERE `' + keys.join('` = ?, `') + '` = ?';
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

/* Update row(s) from table */
_lib.update = (function(table, options, callback) {
	try {
		var client = _client,
		    options = options || {},
			where = options.where || {},
			what = options.what || {},
			limit = options.limit,
		    keys = [],
		    what_keys = [],
		    values = [],
		    query;
		if(!client) return callback("!client");
		foreach(what).do(function(v, k) {
			what_keys.push(k);
			values.push(v);
		});
		foreach(where).do(function(v, k) {
			where_keys.push(k);
			values.push(v);
		});
		query = 'UPDATE `'+table+'` SET `'+ what_keys.join('` = ?, `') + '` = ?';
		if(where_keys.length !== 0) query += ' WHERE `' + where_keys.join('` = ?, `') + '` = ?';
		if(limit) query += ' LIMIT ' + limit;
		util.log("Executing query for sql-mysql.js:update("+sys.inspect(table)+", "+sys.inspect(where)+"): " + query);
		client.query(
			query,
			values,
			function(err, a, b) {
				return callback(err, a, b);
			}
		);
	} catch(e) {
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

/* EOF */
