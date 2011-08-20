
/**
 * Module dependencies.
 */

var express = require('express'),
    request = require('request'),
	config = require('./config.js'),
    sys = require('sys'),
    util = require('util'),
    trim = require('snippets').trim,
    app = module.exports = express.createServer(),
    mysql = require('mysql'),
    client;

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
function mysql_add_email(email, callback) {
	try {
		if(!client) {
			util.log("Creating mysql client...");
			client = mysql.createClient(config.mysql);
		}
		util.log("Executing query for mysql_add_email...");
		client.query(
			'INSERT INTO '+config.ilmo_table+' SET email = ?',
			[email],
			function(err) {
				if(err) return callback(err);
				util.log("Added email: " + email);
				callback();
			}
		);
	} catch(e) {
		callback(e);
	}
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
function mysql_count_emails(callback) {
	var undefined;
	try {
		if(!client) {
			util.log("Creating mysql client...");
			client = mysql.createClient(config.mysql);
		}
		util.log("Executing query for mysql_count_emails...");
		client.query(
			'SELECT COUNT(*) AS count FROM '+config.ilmo_table,
			function(err, results, fields) {
				if(err) return callback(err);
				var count = parseInt(results[0].count, 10);
				callback(undefined, count);
			}
		);
	} catch(e) {
		callback(e);
	}
}

/* */
function db_count_emails(callback) {
	if(config.mysql) return mysql_count_emails(callback);
	if(config.pg) return pg_count_emails(callback);
	util.log("Error: No database settings!");
	callback('Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.');
}

// Configuration

app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	
	app.use(express.logger({ format: ':method :url' }));
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({ secret: "keyboard cat" }));
	app.use(express.methodOverride());
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
	app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res){
	res.redirect('http://game.freeciv.fi/ilmo');
});

app.get('/ilmo/thanks', function(req, res){
	var flash = req.flash();
	res.render('thanks', {title: 'Ilmoitus vastaanotettu', email:email, flash:flash });
});

app.get('/ilmo', function(req, res){
	var flash = req.flash();
	mysql_count_emails(function(err, players) {
		if(err) req.flash('error', "Tietokantayhteydessä tapahtui virhe: Sivulla voi olla vääriä tietoja.");
		var free_players = 126 - players;
		res.render('ilmo', {title: 'Ilmoittautuminen Freeciv Syyskuu 2011/I -otteluun', flash:flash, players:players, 'free_players':free_players});
	});
});

app.post('/ilmo', function(req, res) {
	var email = trim(""+req.body.email),
	    error = true;
	if(email === "") req.flash('error', "Sähköpostiosoite on tyhjä.");
	else if(!email.match('@')) req.flash('error', "Sähköpostiosoite ei ole toimiva: " + email);
	else {
		db_add_email(email, function(err) {
			if(err) {
				util.log('Error: '+err);
				req.flash('error', 'Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.');
			} else {
				req.flash('info', 'Sähköpostiosoite lisätty: ' + email);
				req.flash('info', 'Lähetämme erillisen vahvistuksen vielä ennen pelin aloittamista.');
			}
			res.redirect('http://game.freeciv.fi/ilmo');
		});
		error = false;
	}
	if(error) res.redirect('http://game.freeciv.fi/ilmo');
});

app.listen(3000);

/*
io.sockets.on('connection', function (socket) {
	socket.emit('news', { hello: 'world' });
	socket.on('my other event', function (data) {
		console.log(data);
	});
});
*/

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
