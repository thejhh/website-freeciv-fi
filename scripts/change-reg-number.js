
var fs = require('fs'),
    sys = require('sys'),
	foreach = require('snippets').foreach,
	config = require('../src/config.js');

/* Create SQL object */
function create_sql(type, conf) {
	var client = require(type).createClient(conf);
	var sql = {};
	
	/* Create a group of SQL queries to do a task */
	sql.group = (function() {
		var wares = [];
		foreach(arguments).do(function(ware) {
			wares.push(ware);
		});
		return (function(options, next) {
			try {
				var state = {}, i=0;
				foreach(options).do(function(o, k) { state[k] = o; });
				function iter() {
					if(! (wares[i] && (typeof wares[i] === 'function')) ) {
						next();
						return;
					}
					wares[i](state, function(err) {
						if(err) {
							next(err);
							return;
						}
						i++;
						iter();
					});
				}
				iter();
			} catch(err) {
				next(err);
			}
		});
	});
	
	/* Returns middleware to assign static key=value setting */
	sql.assign = (function(key, value) {
		return (function(options, next) {
			if(key) options[key] = value;
			next();
		});
	});
	
	/* Returns middleware for SQL query */
	sql.query = (function(q) {
		return (function(options, next) {
			
			var q_keys = [],
			    q_values = [],
			    q_str;
			
			console.log('sql.query:');
			console.log('  q = ' + sys.inspect(q) );
			console.log('  options = ' + sys.inspect(options) );
			
			// TODO: Parse named params from query and prepare q_values from options
			q_str = q.replace(/:([a-zA-Z0-9_]+)/g, function(match, contents, offset, s) {
				var key = ""+contents;
				if(!options[key]) return ':'+key;
				q_keys.push(key);
				q_values.push(options[key]);
				return '?';
			});
			
			console.log('  q_str = ' + sys.inspect(q_str) );
			console.log('  q_keys = ' + sys.inspect(q_keys) );
			console.log('  q_values = ' + sys.inspect(q_values) );
			
			var is_select = q_str.match(/^select/i) ? true : false;
			
			client.query(
				q_str,
				q_values,
				function(err, results, fields) {
					if(err) {
						next(err);
						return;
					}
					if(is_select) {
						console.log('results = ' + sys.inspect(results));
						foreach(results).do(function(row) {
							foreach(row).do(function(v, k) {
								console.log('Setting ' + k + ' = ' + v);
								options[k] = v;
							});
						});
					}
					next();
				}
			);
		});
	});
	
	return sql;
}

var sql = create_sql('mysql', config.sql);

/* Build group of queries to get data based on player number */
var get_player_info = sql.group(
);

/* Build group of queries to remove player from game
 * Required game_id: Game ID
 * Required target_player_number: Player number to be replaced with spare player
 * Required spare_player_number: Spare player number (original reg will be removed from DB)
 */
var replace_player = sql.group(
	sql.query('SELECT user_id AS target_user_id                        FROM reg WHERE number=:target_player_number AND game_id=:game_id'),
	sql.query('SELECT user_id AS spare_user_id, reg_id AS spare_reg_id FROM reg WHERE number=:spare_player_number AND game_id=:game_id'),
	sql.query('DELETE FROM player WHERE game_id=:game_id AND reg_id=:spare_reg_id   LIMIT 1'),
	sql.query('DELETE FROM reg    WHERE game_id=:game_id AND reg_id=:spare_reg_id   LIMIT 1'),
	sql.query('DELETE FROM auth   WHERE game_id=:game_id AND user_id=:spare_user_id LIMIT 1'),
	sql.query('UPDATE reg SET user_id=:spare_user_id WHERE user_id=:target_user_id AND game_id=:game_id'),
	sql.query('UPDATE auth SET user_id=:spare_user_id WHERE user_id=:target_user_id AND game_id=:game_id')
);

replace_player({'game_id':1, 'target_player_number':3, 'spare_player_number':4}, function(err) {
	if(err) console.log('Failed to move player: ' + err);
	else console.log('Successfully moved players');
});

/* EOF */
