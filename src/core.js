/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */

/* Core Database Functions for game.freeciv.fi */

var fs = require('fs'),
    sys = require('sys'),
	foreach = require('snippets').foreach,
    sql = require('./sqlmw.js'),
    trim = require('snippets').trim,
	hash = require('./hash.js'),
    core = module.exports = {};

core.dbprefix = '';

/* List of users */
core.listUsers = sql.group(sql.connect(), sql.query('SELECT * FROM '+core.dbprefix+'user ORDER BY user_id'));

/* EOF */
