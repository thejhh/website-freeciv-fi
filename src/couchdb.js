/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */


/**
 * Module dependencies.
 */

var cradle = require('./cradle.js'),
    databases = module.exports = {};

/* Databases */
databases.activations = cradle.database('freeciv-activations');
//databases.sessions = cradle.database('freeciv-sessions');

/* EOF */
