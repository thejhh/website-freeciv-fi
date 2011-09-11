/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */


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
tables.reg = sql.table(table_prefix + 'reg');
tables.auth = sql.table(table_prefix + 'auth');

/* EOF */
