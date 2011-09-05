/* Common interface for relational database */

var sys = require('sys'),
	foreach = require('snippets').foreach,
    _lib = module.exports = require('./mysql.js');

/* Build common interface for accessing data in specific table */
_lib.table = (function(table) {
	var obj = {};
	obj.insert = (function(values, callback) { return _lib.insert(table, values, callback); }); // Insert row
	
	obj.select = (function() {
		var options = {'what': []};
		foreach(arguments).do(function(v) { options.what.push(v); });
		if(options.what.length === 0) options.what.push('*');
		options.leftjoin = [];
		return ({
			'limit':function(limit) {
				options.limit = parseInt(limit, 10);
				return this;
			},
			'leftjoin':function() {
				foreach(arguments).do(function(v) { options.leftjoin.push(v); });
				return this;
			},
			'where':function(where) {
				options.where = where;
				return this;
			},
			'do':function(callback) {
				console.log('Selecting from %s table with %s', table, sys.inspect(options));
				return _lib.select(table, options, callback);
			}
		});
	}); // Select rows
	
	obj.del = (function() {
		var options = {'what': []};
		foreach(arguments).do(function(v) { options.what.push(v); });
		if(options.what.length === 0) options.what.push('*');
		return ({
			'limit':function(limit) {
				options.limit = parseInt(limit, 10);
				return this;
			},
			'where':function(where) {
				options.where = where;
				return this;
			},
			'do':function(callback) {
				console.log('Deleting from %s table with %s', table, sys.inspect(options));
				return _lib.del(table, options, callback);
			}
		});
	}); // Del rows
	
	obj.update = (function(what) {
		var options = {
			'what': what || {}
		};
		return ({
			'limit':function(limit) {
				options.limit = parseInt(limit, 10);
				return this;
			},
			'where':function(where) {
				options.where = where;
				return this;
			},
			'set':function(k, v) {
				options.what[k] = v;
				return this;
			},
			'do':function(callback) {
				console.log('Updating table %s with %s', table, sys.inspect(options));
				return _lib.update(table, options, callback);
			}
		});
	}); // Select rows
	obj.count = (function(callback) { return _lib.count(table, callback); }); // Count table rows
	obj.authcheck = (function(options, callback) { return _lib.authcheck(table, options, callback); }); // Count table rows
	return obj;
});

/* EOF */
