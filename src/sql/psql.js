/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */


/* Please note: This is old and unmaintained code! See mysql-db.js for updated API. */

/**
 * Module depencies
 */


/* */
function pg_add_email(email, callback) {
	var pg = require('pg'),
	    conString = config.pg || 'tcp://postgres:1234@localhost/postgres';
	pg.connect(conString, function(err, client) {
		if(err) return callback(err);
		client.query("INSERT INTO "+config.ilmo_table+" (email) values($1)", [email], function(err, result) {
			if(err) return callback(err);
			console.log("Added email: " + email);
			callback();
		});
	});
}

/* */
function db_add_email(email, callback) {
	if(config.mysql) return mysql_add_email(email, callback);
	if(config.pg) return pg_add_email(email, callback);
	util.log("Error: No database settings!");
	callback('Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.');
}

/* */
function pg_count_emails(callback) {
}

/* */
function db_count_emails(callback) {
	if(config.mysql) return mysql_count_emails(callback);
	if(config.pg) return pg_count_emails(callback);
	util.log("Error: No database settings!");
	callback('Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.');
}

/* EOF */
