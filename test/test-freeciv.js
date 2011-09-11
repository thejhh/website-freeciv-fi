/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */



var sys = require('sys'),
    config = require('./config.js'),
    freeciv = require('./freeciv.js');

freeciv.data("../freeciv.json", function(err, data) {
	if(err) console.error('Error: ' + err);
	else console.log( sys.inspect( data.groups ) );
});
