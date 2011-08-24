
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
		var client = _client, keys=[], values=[], query;
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
_lib.select = (function(table, where, callback) {
	try {
		var client = _client, keys=[], values=[], query;
		if(!client) return callback("!client");
		foreach(where).do(function(v, k) {
			keys.push(k);
			values.push(v);
		});
		query = 'SELECT * FROM `'+table+'`';
		if(keys.length !== 0) query += ' WHERE `' + keys.join('` = ?, `') + '` = ?';
		util.log("Executing query for sql-mysql.js:select("+sys.inspect(table)+", "+sys.inspect(where)+"): " + query);
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
