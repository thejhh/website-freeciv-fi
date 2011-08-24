/* Common interface for relational database */

var _lib = module.exports = require('./mysql.js');

/* Build common interface for accessing data in specific table */
_lib.table = (function(table) {
	var obj = {};
	obj.insert = (function(values, callback) { return _lib.insert(table, values, callback); }); // Insert row
	
	obj.select = (function() {
		var options = {};
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
				return _lib.select(table, options, callback);
			}
		});
	}); // Select rows
	
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
				return _lib.update(table, options, callback);
			}
		});
	}); // Select rows
	obj.count = (function(callback) { return _lib.count(table, callback); }); // Count table rows
	return obj;
});

/* EOF */
