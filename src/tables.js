
/**
 * Module dependencies.
 */

var config = require('./config.js'),
    sql = require('./sql').config(config.sql),
    tables = module.exports = {};

/* Tables */
tables.game = sql.table('game');
tables.user = sql.table('user');
tables.player = sql.table('player');

/* EOF */
