

var config = require('./config.js'),
	cradle = require('cradle'),
	express = require('express'),
	couchdb_config = (config && config.couchdb) || {},
	couchdb_hostname = couchdb_config.hostname || 'localhost',
	couchdb_port = couchdb_config.port || 5984,
	_db_config = {
		auth: { 'username': couchdb_config.username, 'password': couchdb_config.password }
	},
    _con = new(cradle.Connection)(couchdb_hostname, couchdb_port, _db_config),
	_lib = module.exports || {};

_lib.database = (function(name) {
	return _con.database(name);
});
