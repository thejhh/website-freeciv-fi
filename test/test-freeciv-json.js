
/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */

var fs = require('fs'),
    sys = require('sys');
fs.readFile('./freeciv.json', 'utf-8', function(err, data) {
	if(err) console.error('Error: '+err);
	else console.log('data = %s', sys.inspect(JSON.parse(data)) );
});
