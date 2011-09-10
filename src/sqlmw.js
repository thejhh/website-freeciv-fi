/* Setup our object for sqlmw */

var config = require('../src/config.js'),
    sql = module.exports = require('sqlmw')('mysql', config.sql, {'debug':true});

/* EOF */
