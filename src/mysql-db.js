
/**
 * Module dependencies.
 */

var config = require('./config.js'),
    util = require('util'),
    sys = require('sys'),
    foreach = require('snippets').foreach,
    mysql = require('mysql'),
    _lib = module.exports = {},
    _client;

/* */
_lib.client = (function() {
	if(!_client) {
		util.log("Creating mysql client...");
		_client = mysql.createClient(config.mysql);
	}
	return _client;
});

/* Insert row to table */
_lib.insert = (function(table, data, callback) {
	try {
		var client = _lib.client(), keys=[], values=[], query;
		if(!client) return callback("!client");
		foreach(data).do(function(v, k) {
			keys.push(k);
			values.push(v);
		});
		query = 'INSERT INTO `'+table+'` SET `' + keys.join('` = ?, ') + '` = ?, ';
		util.log("Executing query for mysql-db.js:insert("+sys.inspect(table)+", "+sys.inspect(data)+"): " + query);
		client.query(
			query,
			values,
			function(err) {
				if(err) return callback(err);
				util.log("Added email: " + email);
				callback();
			}
		);
	} catch(e) {
		callback(e);
	}
});

/* Count table rows */
_lib.count = (function(callback) {
	var undefined;
	try {
		var client = _lib.client();
		if(!client) return callback("!client");
		util.log("Executing query for db.countUsers()...");
		client.query(
			'SELECT COUNT(*) AS count FROM '+config.user_table,
			function(err, results, fields) {
				if(err) return callback(err);
				var count = parseInt(results[0].count, 10);
				callback(undefined, count);
			}
		);
	} catch(e) {
		callback(e);
	}
});

/* EOF */
