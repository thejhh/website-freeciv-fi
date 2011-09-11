/*
 * Our error type that can be shown to website users
 */

/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, __filename: false, __dirname: false */

function WebError(msg, orig){
	this.name = 'WebError';
	this.msg = ""+msg;
	this.orig = orig;
	Error.call(this, ""+msg);
	Error.captureStackTrace(this, WebError);
}

var proto = '__proto__';

WebError.prototype[proto] = Error.prototype;

WebError.prototype.toString = function() {
	return this.name + ": " + this.msg;
};

module.exports = WebError;

/* EOF */
