/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */


/* API to Freeciv JSON */

var fs = require('fs'),
	foreach = require('snippets').foreach,
	_data = {},
    _lib = module.exports = {};

/* Build references */
function build_references(file) {
	foreach(_data[file].nations).each(function(nation) {
		foreach(nation.groups).each(function(group) {
			if(!_data[file].groups) {
				_data[file].groups = {};
			}
			if(!_data[file].groups[group]) {
				_data[file].groups[group] = [];
			}
			_data[file].groups[group].push(nation);
		});
	});
}

/* Load */
function load(file, next) {
	fs.readFile(file, "utf-8", function(err, data) {
		if(err) {
			return next('Error reading: '+file+': ' + err);
		}
		_data[file] = JSON.parse(data);
		build_references(file);
		next();
	});
}

/* Get data */
_lib.data = function(file, fn) {
	if(_data[file]) {
		return fn(undefined, _data[file]);
	}
	load(file, function(err) {
		if(err) {
			return fn(err);
		}
		fn(undefined, _data[file]);
	});
};

/* EOF */
