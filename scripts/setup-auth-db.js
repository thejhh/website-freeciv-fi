/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */


var fs = require('fs'),
    sys = require('sys'),
	tables = require('../src/tables.js'),
	foreach = require('snippets').foreach,
    game_id = 1;

tables.reg.select('r.reg_id AS reg_id', 
	'r.number AS number', 
	'r.user_id AS user_id', 
	'p.name AS name').as('r').leftjoin('player AS p ON r.reg_id=p.reg_id', 'user AS u ON r.user_id=u.user_id').where({'r.game_id':game_id}).exec(function(err, data) {
	if(err) {
		console.log('Error: ' + err);
		return;
	}
	
	foreach(data).each(function(row) {
		if(row.number > 126) {
			return;
		}
		var name = row.name,
		    number = row.number,
		    reg_id = row.reg_id,
		    user_id = row.user_id,
		    username = (""+name).toLowerCase()
		                .replace(/[äÄåÅáàâãä]/g, 'a')
		                .replace(/[öÖóòõôö]/g, 'o')
		                .replace(/'/g, "")
		                /*jslint regexp: false*/
		                .replace(/[^a-z0-9_]+/g, "_")
		                /*jslint regexp: true*/
		                .substr(0, 32)
		                .replace(/^_+/, "")
		                .replace(/_+$/, "")
		                .replace(/_+/g, "_");
		console.log("Creating account name for player #" + row.number + " as '" + username +"' (from '" + name + "')...");
		
		console.log("number = " + sys.inspect(number));
		console.log("name = " + sys.inspect(name));
		console.log("game_id = " + sys.inspect(game_id));
		console.log("reg_id = " + sys.inspect(reg_id));
		console.log("user_id = " + sys.inspect(user_id));
		console.log("username = " + sys.inspect(username) + " (length = " + username.length + ")");
		
		if(!game_id) {
			return;
		}
		if(!user_id) {
			return;
		}
		if(!username) {
			return;
		}
		if(!number) {
			return;
		}
		if(!( (number >= 1) && (number <= 126) )) {
			return;
		}
		if(!reg_id) {
			return;
		}
		tables.auth.insert({'game_id':game_id, 'user_id':user_id, 'name':username}, function(err3, auth_id) {
			if(err3) {
				console.log('Error: ' + err3);
			} else {
				console.log('Added username #' + auth_id);
			}
		});
	});
});

