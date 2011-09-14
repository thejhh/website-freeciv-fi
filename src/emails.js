/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, __filename: false, __dirname: false */


/* Service emails */

var nodemailer = require('nodemailer'),
    config = require('./config.js'),
    foreach = require('snippets').foreach,
    fs = require('fs'),
    sys = require('sys'),
	util = require('util'),
    _lib = module.exports = {};

RegExp.escape = function(text) {
	return text.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
};

// one time action to set up SMTP information
nodemailer.SMTP = config.smtp || {};

/* Render mail body */
function render_file(file, context, callback) {
	util.log('Reading email from file...');
	fs.readFile(file, 'utf-8', function(err, data) {
		util.log('Rendering email...');
		if(err) {
			return callback(err, data);
		}
		foreach(context).each(function(v, k) {
			data = data.replace('{'+k+'|s}', v);
			data = data.replace('{'+k+'|u}', encodeURI(v));
			data = data.replace('{'+k+'|uc}', encodeURIComponent(v));
		});
		callback(undefined, data);
	});
}

/* Send email */
_lib.send = function(file, context, options, callback) {
	util.log('Sending email...');
	options = options || {};
	if(!options.to) {
		return callback("Missing: to");
	}
	if(!options.subject) {
		return callback('Missing: subject');
	}
	if(!options.sender) {
		options.sender = config.sender || 'Freeciv Fi <freeciv@freeciv.fi>';
	}
	render_file(file, context, function(err, data) {
		if(err) {
			return callback(err);
		}
		util.log('Sending rendered file...');
		util.log("Mailing with headers '" + sys.inspect(options) + "'");
		options.body = data;
		nodemailer.send_mail(options,
			function(err, success){
				util.log('Mailing to ' + options.to + ': Message ' + (success ? 'sent' : 'failed') );
			});
		callback();
	});
};

/* EOF */
