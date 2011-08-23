
/**
 * Module dependencies.
 */

var sql = require('./sql.js');
    _lib = module.exports = {},
    _client;

/* Tables */
_lib.game = sql.table('game');
_lib.user = sql.table('user');
_lib.player = sql.table('player');

/* EOF */
