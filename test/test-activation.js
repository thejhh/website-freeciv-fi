/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */



var sys = require('sys'),
    config = require('./config.js'),
    activation = require('./activation.js');

function do_error(msg) {
	console.log("Error: " + sys.inspect(msg) );
	process.exit(1);
}

activation.create({'user_id':1234}, function(err, key) {
	if(err) return do_error(err);
	console.log('Activation created for key: ' + key);
	activation.test(key, function(err, data) {
		if(err) return do_error(err);
		console.log('Received data: ' + sys.inspect(data));
		activation.remove(key, function(err, data) {
			if(err) return do_error(err);
			console.log('Removed key ' + key);
			process.exit(0);
		});
	});
});

/*
activation.test('helloworld', function(err, data) {
	if(err) return do_error(err);
	console.log('Received data: ' + sys.inspect(data));
});
*/
