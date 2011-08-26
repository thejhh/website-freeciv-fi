
var fs = require('fs'),
    sys = require('sys');
fs.readFile('./freeciv.json', 'utf-8', function(err, data) {
	if(err) console.error('Error: '+err);
	else console.log('data = %s', sys.inspect(JSON.parse(data)) );
});
