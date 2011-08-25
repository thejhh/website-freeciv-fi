
/**
 * Module dependencies.
 */

var _lib = module.exports = {};

/* Create new random key */
_lib.string = (function(length) {
	var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz",
		length = length || 32,
		out = '',
		i=0;
	for (; i<length; i++) out += chars[Math.floor(Math.random() * chars.length)];
	return out;
});

/* EOF */
