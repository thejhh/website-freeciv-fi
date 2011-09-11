/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */



var config = require('./config.js'),
	couchdb = require('./couchdb.js');

// TODO: Create ./sessions

// TODO: Create MySQL databases

// TODO: Create couchdb databases
//if(!_db.exists()) 
couchdb.activations.create();

