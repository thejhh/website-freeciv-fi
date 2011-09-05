
var fs = require('fs'),
    sys = require('sys'),
	tables = require('../src/tables.js'),
	foreach = require('snippets').foreach;

function get_random_nation(callback) {
	var undefined;
	fs.readFile('./freeciv.json', 'utf-8', function(err, data) {
		if(err) return callback(err);
		
		var nations = JSON.parse(data).nations;
		console.log("There is " + nations.length + " nations.");
		var nation = nations[Math.floor(Math.random()*nations.length)];
		var leader = nation.leaders[Math.floor(Math.random()*nation.leaders.length)];
		
		callback(undefined, nation, leader);
	});
}


var game_id = 1;
tables.reg.select('r.reg_id AS reg_id', 'r.number AS number', 'p.name AS name').as('r').leftjoin('player AS p ON r.reg_id=p.reg_id', 'user AS u ON r.user_id=u.user_id').where({'r.game_id':game_id}).do(function(err, data) {
	if(err) {
		console.log('Error: ' + err);
		return;
	}
	
	foreach(data).do(function(row) {
		if(row.number > 126) return;
		if(row.name) return;
		var number = row.number;
		var reg_id = row.reg_id;
		console.log("Choosing nation for player #" + row.number + " by random...");
		
		get_random_nation(function(err2, nation, leader) {
			if(err2) {
				console.log('Error: ' + err2);
				return;
			}
			console.log("number = " + sys.inspect(number));
			console.log("game_id = " + sys.inspect(game_id));
			console.log("reg_id = " + sys.inspect(reg_id));
			if(!number) return;
			if(!( (number >= 1) && (number <= 126) )) return;
			if(!game_id) return;
			if(!reg_id) return;
			if(!leader) return;
			if(!nation) return;
			if(!leader.name) return;
			if(!nation.name) return;
			console.log("leader = " + sys.inspect(leader.name));
			console.log("nation = " + sys.inspect(nation.name));
			tables.player.insert({'game_id':game_id, 'reg_id':reg_id, 'name':leader.name, 'nation':nation.name}, function(err3, player_id) {
				if(err3) console.log('Error: ' + err3);
				else console.log('Added player #' + player_id);
			});
		});
		
	});
});

