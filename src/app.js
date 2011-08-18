
/**
 * Module dependencies.
 */

var express = require('express'),
    request = require('request'),
	config = require('./config.js'),
	pg = require('pg'),
    sys = require('sys'),
    util = require('util'),
    trim = require('snippets').trim,
    app = module.exports = express.createServer(),
	expressValidate = require('express-validate');
//	io = require('socket.io').listen(app);


/* */
function db_add_email(email, callback) {
	var conString = config.pg || 'tcp://postgres:1234@localhost/postgres';
	pg.connect(conString, function(err, client) {
		if(err) return callback(err);
		client.query("INSERT INTO "+config.ilmo_table+" (email) values($1)", [email], function(err, result) {
			if(err) return callback(err);
			console.log("Added email: %s". email);
			callback();
		});
	});
}

// Configuration

app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	
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
	res.redirect('/ilmo');
});

app.get('/ilmo/thanks', function(req, res){
	var flash = req.flash();
	res.render('thanks', {title: 'Ilmoitus vastaanotettu', email:email, flash:flash });
});

app.get('/ilmo', function(req, res){
	var flash = req.flash();
	res.render('ilmo', {title: 'Ilmoittautuminen', flash:flash});
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
			res.redirect('/ilmo');
		});
		error = false;
	}
	if(error) res.redirect('/ilmo');
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
