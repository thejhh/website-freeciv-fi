#!/usr/bin/env node

var fs = require('fs'),
    sys = require('sys'),
	foreach = require('snippets').foreach,
	config = require('../src/config.js'),
    sql = require('sqlmw')('mysql', config.sql, {'debug':true});

/* Build group of queries to remove player from game
 * Required game_id: Game ID
 * Required target_player_number: Player number to be replaced with spare player
 * Required spare_player_number: Spare player number (original reg will be removed from DB)
 */
var replace_player = sql.group(
	sql.connect(),
	sql.query('SELECT user_id AS target_user_id                        FROM reg WHERE number=:target_player_number AND game_id=:game_id'),
	sql.query('SELECT user_id AS spare_user_id, reg_id AS spare_reg_id FROM reg WHERE number=:spare_player_number AND game_id=:game_id'),
	sql.query('DELETE FROM player WHERE game_id=:game_id AND reg_id=:spare_reg_id   LIMIT 1'),
	sql.query('DELETE FROM reg    WHERE game_id=:game_id AND reg_id=:spare_reg_id   LIMIT 1'),
	sql.query('DELETE FROM auth   WHERE game_id=:game_id AND user_id=:spare_user_id LIMIT 1'),
	sql.query('UPDATE reg SET user_id=:spare_user_id WHERE user_id=:target_user_id AND game_id=:game_id'),
	sql.query('UPDATE auth SET user_id=:spare_user_id WHERE user_id=:target_user_id AND game_id=:game_id')
);

var argv = require('optimist')
    .usage('Usage: $0 --game=N --target=N --spare=N')
    .demand(['game','target','spare'])
    .argv;

var game_id = argv.game;
var target_player_number = argv.target;
var spare_player_number = argv.spare;

if(game_id && target_player_number && spare_player_number) {
	replace_player({'game_id':game_id, 'target_player_number':target_player_number, 'spare_player_number':spare_player_number}, function(err) {
		if(err) {
			console.log('Failed to move player: ' + err);
			process.exit(1);
		} else {
			console.log('Successfully moved players');
			process.exit(0);
		}
	});
}

/* EOF */
