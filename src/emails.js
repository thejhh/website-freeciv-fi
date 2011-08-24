
/* Service emails */

var nodemailer = require('nodemailer'),
    config = require('./config.js'),
    foreach = require('snippets').foreach,
    fs = require('filesystem'),
	util = require('util'),
    _lib = module.exports = {};

// one time action to set up SMTP information
nodemailer.SMTP = config.smtp || {};

/* Render mail body */
function render_file(file, context, callback) {
	fs.readFileSync(file, 'utf-8', function(err, data) {
		var undefined;
		if(err) return callback(err, data);
		foreach(context).do(function(v, k) {
			data.replace('{'+k+'}', urlencode(v));
		});
		callback(undefined, data);
	});
}

/* Send email */
_lib.send = (function(file, context, options, callback) {
	options = options || {};
	if(!options.to) return callback("Missing: to");
	if(!options.subject) return callback('Missing: subject');
	if(!options.sender) options.sender = config.sender || 'Freeciv.fi <freeciv@freeciv.fi>',
	render_file(file, context, function(err, data) {
		util.log("Mailing with headers '" + sys.inspect(options) + "'");
		options.body = data;
		nodemailer.send_mail(options,
			function(err, success){
				util.log('Mailing to ' + options.to + ': Message ' + (success ? 'sent' : 'failed') );
				callback(err);
			}
		);
	});
});

/* EOF */
