
var fs = require('fs'),
    sys = require('sys');
fs.readFile('./freeciv.json', 'utf-8', function(err, data) {
	if(err) {
		console.error('Error: '+err);
		return;
	}

	var nations = JSON.parse(data).nations;
	console.log("There is " + nations.length + " nations.");
	var nation = nations[Math.floor(Math.random()*nations.length)];
	var leader = nation.leaders[Math.floor(Math.random()*nation.leaders.length)];
	
	console.log("leader = " + sys.inspect(leader.name));
	console.log("nation = " + sys.inspect(nation.name));
});
