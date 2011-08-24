
/**
 * Module dependencies.
 */

var express = require('express'),
    params = require('express-params'),
    request = require('request'),
	config = require('./config.js'),
	site_url = config.url || 'http://game.freeciv.fi',
    sys = require('sys'),
    util = require('util'),
    trim = require('snippets').trim,
    app = module.exports = express.createServer(),
    tables = require('./tables.js'),
    couchdb = require('./couchdb.js'),
    activation = require('./activation.js'),
    emails = require('./emails.js'),
    FileStore = require('./FileStore.js')(express),
    client;

// Configuration

// Set default umask
process.umask(0077);

params.extend(app);
	
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

// Helpers
app.dynamicHelpers({
	session: function(req, res){
		return req.session;
	},
	flash: function(req, res) {
		return req.flash();
	},
	param: function(req, res){
		return (function(key, def) {
			return req.param(key, def);
		});
	},
});

/* Markdown view engine
app.register('.md', {
	compile: function(str, options){
		var html = md.toHTML(str);
		return function(locals){
			return html.replace(/\{([^}]+)\}/g, function(_, name){
				return locals[name];
			});
		}
	});
*/

// Params

/* Authentication Key for acquiring lost login information */
app.param('authKey', function(req, res, next, id){
	var key = ""+req.params.authKey;
	activation.test(key, function(err, data) {
		if(err) return next('Virheellinen aktivointiavain');
		req.authKey = key;
		next();
	});
});

/* Game Tag */
app.param('gameTag', function(req, res, next, id){
	var game_tag = ""+req.params.gameTag;
	tables.game.select({'tag':game_tag}, function(err, data) {
		if(err) return next('Virhe tietokantayhteydessä. Kokeile hetken kuluttua uudelleen.');
		if(!data[0]) return next('Virheellinen pelin tunniste');
		req.game_id = data[0].game_id;
		req.game = data[0];
		next();
	});
});

/* Game Id */
app.param('gameId', function(req, res, next, id){
	var game_id = parseInt(""+req.params.gameId, 10);
	tables.game.select({'game_id':game_id}, function(err, data) {
		if(err) return next('Virhe tietokantayhteydessä. Kokeile hetken kuluttua uudelleen.');
		if(!data[0]) return next('Virheellinen pelin tunniste');
		req.game_id = game_id;
		req.game = data;
		next();
	});
});

// Routes

/* Root route */
app.get('/', function(req, res){
	res.redirect(site_url+'/game');
});

app.get('/ilmo', function(req, res){
	res.redirect(site_url+'/game/2011-I');
});

/* Validate and prepare email keyword */
function prepBodyEmail(key) {
	var key = key || 'email';
	return (function(req, res, next) {
		function on_error(msg) {
			req.flash('error', "Sähköpostiosoite on virheellinen");
			res.redirect('back');
		}
		if(!req.body[key]) return on_error("Osoite puuttuu");
		var email = trim(""+req.body[key]);
		if(email.length === 0) return on_error("Osoite on tyhjä");
		if(!email.match('@')) return on_error("Ei ole toimiva: " + email);
		req[key] = email;
		next();
	});
}

/* Create authKey */
function createAuthKey(email_key) {
	var email_key = email_key || 'email';
	return (function(req, res, next) {
		var email = req[email_key],
		    user_id = req.user_id;
		activation.create({'user_id':user_id}, function(err, key) {
			if(err) return next(err);
			req.authKey = key;
			next();
		});
	});
}

/* Send authKey using email */
function sendEmailAuthKey() {
	return (function(req, res, next) {
		emails.send('./templates/authKey-mail.txt', {'authKey':req.authKey}, {'subject':'Käyttäjätunnuksen vahvistus', 'to':req.email}, function(err) {
			if(err) {
				util.log('Error: ' + err);
				req.flash('error', 'Vahvistusviestin lähetys epäonnistui.');
			} else {
				req.flash('info', 'Vahvistusviesti lähetetty onnistuneesti.');
			}
			next();
		});
	});
}

/* Handle requests for authKey */
app.post('/login/reset', prepBodyEmail(), createAuthKey(), sendEmailAuthKey(), function(req, res){
	res.render('login/reset', {'title': 'Salasanan vaihtaminen'});
});

/* Display login reset page */
app.get('/login/reset', function(req, res){
	res.render('login/reset', {'title': 'Salasanan vaihtaminen'});
});

/* Display login page */
app.get('/login', function(req, res){
	res.render('login/index', {title: 'Sisäänkirjautuminen' });
});

/* Ask validation from user for authKey */
app.get('/act/:authKey', function(req, res){
	var key = ""+req.params.authKey;
	res.render('act', {title: 'Tietojen aktivoiminen', key:key});
});

/* Game page */
app.get('/game', function(req, res){
	var latest_game = '2011-I';
	res.redirect(site_url+'/game/'+latest_game+'/index');
});

/* Game page */
app.get('/game/:gameTag', function(req, res){
	res.redirect(site_url+'/game/'+req.game.tag+'/index');
});

/* Game page */
app.get('/game/:gameTag/index', function(req, res){
	tables.user.count(function(err, players) {
		if(err) req.flash('error', "Tietokantayhteydessä tapahtui virhe: Sivulla voi olla vääriä tietoja.");
		var free_players = 126 - players;
		res.render('reg', {title: 'Freeciv.fi Syyskuu 2011/I', players:players, 'free_players':free_players});
	});
});

/* Handle registration request */
app.post('/game/:gameTag/reg', function(req, res) {
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
			res.redirect(site_url+'/reg');
		});
		error = false;
	}
	if(error) res.redirect(site_url+'/reg');
});

/* Set port to listen */
app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
