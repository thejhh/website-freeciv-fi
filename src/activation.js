
/**
 * Module dependencies.
 */

var config = require('./config.js'),
    _db = require('./couchdb.js').activations,
    _lib = module.exports = {};

/* Test activation key */
_lib.test = (function(key, callback) {
	_db.get(key, function (err, doc) {
		var undefined;
		if(err) callback(err);
		else callback(undefined, doc);
	});
});

/* Remove activation key */
_lib.remove = (function(key, callback) {
	_lib.test(key, function(err, data) {
		if(err) return callback(err, data);
		else _db.remove(key, data._rev, function (err, res) {
			callback(err, res);
		});
	});
});

/* Create new activation keyword */
_lib.create_key = (function() {
	var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz",
		length = length || 32,
		out = '',
		i=0;
	for (; i<length; i++) out += chars[Math.floor(Math.random() * chars.length)];
	return out;
});

/* Create new activation request for data */
_lib.create = (function(data, callback) {
	var undefined, key = _lib.create_key();
	data.creation = new Date();
	_db.save(key, data, function (err, res) {
		if (err) return callback(err);
		callback(undefined, key);
	});
});

/* EOF */
