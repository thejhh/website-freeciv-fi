
/**
 * Module dependencies.
 */

var express = require('express'),
    request = require('request'),
	config = require('./config.js'),
	site_url = config.url || 'http://game.freeciv.fi',
    sys = require('sys'),
    util = require('util'),
    trim = require('snippets').trim,
    app = module.exports = express.createServer(),
    tables = require('./tables.js'),
    couchdb = require('./couchdb.js'),
    FileStore = require('./FileStore.js')(express),
    client;

// Configuration

process.umask(0077);

app.configure(function(){
	var secret = (config && config.session && config.session.secret) || 'keyboard cat';
	
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	
	app.use(express.logger({ format: ':method :url' }));
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({ 'secret':secret, 'store':new FileStore }));
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
	res.redirect(site_url+'/ilmo');
});

app.get('/ilmo/thanks', function(req, res){
	var flash = req.flash();
	res.render('thanks', {title: 'Ilmoitus vastaanotettu', email:email, flash:flash });
});

app.get('/ilmo', function(req, res){
	var flash = req.flash();
	tables.user.count(function(err, players) {
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
		tables.user.insert({'email':email}, function(err) {
			if(err) {
				util.log('Error: '+err);
				req.flash('error', 'Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.');
			} else {
				req.flash('info', 'Sähköpostiosoite lisätty: ' + email);
				req.flash('info', 'Lähetämme erillisen vahvistuksen vielä ennen pelin aloittamista.');
			}
			res.redirect(site_url+'/ilmo');
		});
		error = false;
	}
	if(error) res.redirect(site_url+'/ilmo');
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
