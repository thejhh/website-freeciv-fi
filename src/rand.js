/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */


/**
 * Module dependencies.
 */

var _lib = module.exports = {};

/* Create new random key */
_lib.string = function(length) {
	length = length || 32;
	var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz",
		out = '',
		i=0;
	for (; i<length; i=i+1) {
		out += chars[Math.floor(Math.random() * chars.length)];
	}
	return out;
};

/* EOF */
