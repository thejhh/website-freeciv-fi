/* Common interface for relational database */

var _lib = module.exports = require('./mysql.js');

/* Build common interface for accessing data in specific table */
_lib.table = (function(table) {
	var obj = {};
	obj.insert = (function(values, callback) { return _lib.insert(table, values, callback); }); // Insert row
	obj.select = (function(where, callback) { return _lib.select(table, where, callback); }); // Select rows
	obj.count = (function(callback) { return _lib.count(table, callback); }); // Count table rows
	return obj;
});

/* EOF */
