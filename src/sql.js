/* Common interface for relational database */

var _lib = module.exports = require('./sql-mysql.js');

/* Build common interface for accessing data in specific table */
_lib.table = (function(table) {
	var obj = {};
	
	/* Insert row to table */
	obj.insert = (function(values, callback) {
		return _lib.insert(table, values, callback);
	});
	
	/* Count table rows */
	obj.count = (function(callback) {
		return _lib.count(table, callback);
	});
	
	return obj;
});

/* EOF */
