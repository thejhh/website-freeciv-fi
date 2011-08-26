

var sys = require('sys'),
    config = require('./config.js'),
    freeciv = require('./freeciv.js');

freeciv.data("../freeciv.json", function(err, data) {
	if(err) console.error('Error: ' + err);
	else console.log( sys.inspect( data.groups ) );
});
