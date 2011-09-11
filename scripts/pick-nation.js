
/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */

var fs = require('fs'),
    sys = require('sys');

fs.readFile('./freeciv.json', 'utf-8', function(err, data) {
	if(err) {
		console.error('Error: '+err);
		return;
	}

	var nations = JSON.parse(data).nations,
	    nation = nations[Math.floor(Math.random()*nations.length)],
	    leader = nation.leaders[Math.floor(Math.random()*nation.leaders.length)];
	
	console.log("There is " + nations.length + " nations.");
	console.log("leader = " + sys.inspect(leader.name));
	console.log("nation = " + sys.inspect(nation.name));
});
