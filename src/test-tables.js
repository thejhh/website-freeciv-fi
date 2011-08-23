

var config = require('./config.js'),
    tables = require('./tables.js');

function do_error(msg) {
	console.log("Error: " + msg);
	process.exit(1);
}

tables.game.insert({'name':'Syyskuu 2011'}, function(err, game_id) {
	if(err) return do_error(err);
	tables.user.insert({'email':'foo@jhh.me'}, function(err, user_id) {
		if(err) return do_error(err);
		tables.player.insert({'game_id':game_id, 'user_id':user_id, 'name':'King Foo'}, function(err, player_id) {
			if(err) return do_error(err);
			process.exit(0);
		});
	});
});

