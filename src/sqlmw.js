/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */

/* Setup our object for sqlmw */

var config = require('../src/config.js'),
    sql = module.exports = require('sqlmw')('mysql', config.sql, {'debug':true});

/* EOF */
