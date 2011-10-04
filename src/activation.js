
/**
 * Module dependencies.
 */

/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */

var config = require('./config.js'),
    _rand = require('./rand.js'),
    _db = require('./couchdb.js').activations,
    _lib = module.exports = {};

/* Test activation key */
_lib.test = function(key, callback) {
	_db.get(key, function (err, doc) {
		if(err) {
			callback(err);
		} else {
			callback(undefined, doc);
		}
	});
};

/* Remove activation key */
_lib.remove = function(key, callback) {
	_lib.test(key, function(err, data) {
		if(err) {
			return callback(err, data);
		}
		_db.remove(key, data._rev, function (err, res) {
			callback(err, res);
		});
	});
};

/* Create new activation keyword */
_lib.create_key = function() {
	return _rand.string(32);
};

/* Create new activation request for data */
_lib.create = function(data, callback) {
	var key = _lib.create_key();
	data.creation = new Date();
	_db.save(key, data, function (err, res) {
		if (err) {
			return callback(err);
		}
		callback(undefined, key);
	});
};

/* Remove obsolete activation keys */
_lib.clean = function(callback) {
	_db.view('all', function (err, res) {
		res.forEach(function(row) {
			
		});
		callback(err, res);
	});
};

/* EOF */
