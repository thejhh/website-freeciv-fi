
/**
 * Module dependencies.
 */

var config = require('./config.js'),
    sql = require('./sql').config(config.sql),
    tables = module.exports = {},
	table_prefix = (config && config.table_prefix) || '';

/* Tables */
tables.game = sql.table(table_prefix + 'game');
tables.user = sql.table(table_prefix + 'user');
tables.player = sql.table(table_prefix + 'player');

/* EOF */
