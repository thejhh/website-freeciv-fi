
/**
 * Module dependencies.
 */

var sql = require('./sql'),
    tables = module.exports = {};

/* Tables */
tables.game = sql.table('game');
tables.user = sql.table('user');
tables.player = sql.table('player');

/* EOF */
