
/**
 * Module dependencies.
 */

var cradle = require('./cradle.js'),
    databases = module.exports = {};

/* Databases */
databases.activations = cradle.database('freeciv-activations');
databases.sessions = cradle.database('freeciv-sessions');

/* EOF */
