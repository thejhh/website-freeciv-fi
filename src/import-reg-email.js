

var http = require('http'),
    querystring = require('querystring'),
    config = require('./config.js'),
    tables = require('./tables.js');

function do_error(msg) {
	console.log("Error: " + msg);
	process.exit(1);
}

var game_id = 1;
var email = process.argv[2];
if(!email) do_error("!email");

tables.user.insert({'email':email}, function(err, user_id) {
	if(err) return do_error(err);
	tables.reg.insert({'game_id':game_id, 'user_id':user_id}, function(err, reg_id) {
		if(err) return do_error(err);
		
		var options = {
			host: 'game.freeciv.fi',
			port: 3001,
  			path: '/login/reset',
			method: 'POST',
			headers: {'content-type':'application/x-www-form-urlencoded'}
		};
		
		var req = http.request(options, function(res) {
			if(res.statusCode !== 302) return do_error('status was ' + res.statusCode);
			console.log("Done");
			process.exit(0);
		});
		
		req.on('error', function(e) {
			console.log('problem with reset request: ' + e.message);
		});
		
		req.write(querystring.stringify({email:email}));
		req.end();
	});
});

