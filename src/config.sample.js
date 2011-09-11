/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */

var config = module.exports || {};

config.ilmo_table = 'ilmo';

//config.pg = 'tcp://postgres:1234@localhost/postgres';

config.mysql = {
	'host': 'localhost',
	'user': 'freeciv',
	'password': 'salakala',
	'database': 'freeciv'
};
