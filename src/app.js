
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
    foreach = require('snippets').foreach,
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

function WebError(msg){
	this.name = 'WebError';
	Error.call(this, ""+msg);
	Error.captureStackTrace(this, arguments.callee);
}

WebError.prototype.__proto__ = Error.prototype;

WebError.prototype.toString = (function() {
	return this.name + ": " + this.message;
});

app.error(function(err, req, res, next){
	if (err instanceof WebError) {
		req.flash('error', ''+err);
		res.render('error.jade');
	} else {
		next(err);
	}
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
		if(err) return next(new WebError('Virheellinen aktivointiavain'));
		console.log('authKeyData = ' + sys.inspect(data));
		if(!data.user_id) return next('Virheellinen aktivointidata: user_id puuttuu');
		tables.user.select().where({'user_id':data.user_id}).limit(1).do(function(err, rows) {
			if(err) return next('Virheellinen aktivointidata: tietokantavirhe');
			if(!rows[0]) return next('Virheellinen aktivointidata: user rivi puuttuu');
			req.authKey = key;
			req.authKeyData = data;
			req.user = rows[0];
			req.user_id = data.user_id;
			req.email = req.user['email'];
			next();
		});
	});
});

/* Game Tag */
app.param('gameTag', function(req, res, next, id){
	var game_tag = ""+req.params.gameTag;
	tables.game.select().where({'tag':game_tag}).limit(1).do(function(err, data) {
		if(err) return next(new WebError('Virhe tietokantayhteydessä. Kokeile hetken kuluttua uudelleen.'));
		if(!data[0]) return next(new WebError('Virheellinen pelin tunniste'));
		req.game_id = data[0].game_id;
		req.game = data[0];
		next();
	});
});

/* Game Id */
app.param('gameId', function(req, res, next, id){
	var game_id = parseInt(""+req.params.gameId, 10);
	tables.game.select().where({'game_id':game_id}).limit(1).do(function(err, data) {
		if(err) return next(new WebError('Virhe tietokantayhteydessä. Kokeile hetken kuluttua uudelleen.'));
		if(!data[0]) return next(new WebError('Virheellinen pelin tunniste'));
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

/* Validate and prepare login */
function prepLoginAuth(back) {
	var back = back || 'back';
	util.log('start of prepLoginAuth()');
	return (function(req, res, next) {
		util.log('call to prepLoginAuth() instance');
		function on_error(msg) {
			req.flash('error', "Kirjautuminen epäonnistui");
			res.redirect(back);
		}
		util.log('req.body = ' + sys.inspect(req.body));
		if(!req.body["email"]) return on_error("missing email");
		if(!req.body["password"]) return on_error("missing password");
		var email = ""+req.body.email,
		    password = ""+req.body.password;
		util.log('Checking auth for email = ' + sys.inspect(email));
		tables.user.authcheck({'email':email, 'password':password}, function(err, valid) {
			if(err) return on_error('Kirjautuminen epäonnistui');
			if(!valid) return on_error('Kirjautuminen epäonnistui');
			util.log('Fetching user data for email = ' + sys.inspect(email));
			tables.user.select().where({'email':email}).limit(1).do(function(err, data) {
				if(err) return on_error('Kirjautuminen epäonnistui');
				if(!data[0]) return on_error('Kirjautuminen epäonnistui');
				delete data[0].password;
				req.session.user = data[0];
				util.log('User logged in as ' + sys.inspect(req.session.user));
				req.flash('info', 'Sisäänkirjautuminen onnistui.');
				next();
			});
		});
	});
}

/* Check that user has logged in */
function checkAuth() {
	return (function(req, res, next) {
		if(!(req.session && req.session.user)) {
			util.log('checkAuth(): failed');
			return next(new WebError("Access Denied"));
		}
		util.log('checkAuth(): successful');
		next();
	});
}

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

/* Validate and prepare password keywords */
function prepBodyPasswords(key1, key2) {
	var key1 = key1 || 'password',
	    key2 = key2 || 'password2';
	return (function(req, res, next) {
		function on_error(msg) {
			req.flash('error', "Salasanat ovat virheellisiä: "+msg);
			res.redirect('back');
		}
		if(!(req.body[key1] && req.body[key2])) return on_error("Toinen salasanoista puuttuu");
		var pw1 = ""+req.body[key1];
		var pw2 = ""+req.body[key2];
		if(pw1.length < 8) return on_error("Salasanan tulee olla vähintään kahdeksan (8) merkkiä pitkä");
		if(pw1 !== pw2) return on_error("Salasanat eivät vastaa toisiaan");
		req[key1] = pw1;
		next();
	});
}

/* Validate and prepare data by keyword */
function prepSQLRowBy(table, key) {
	var table = table || 'user',
	    key = key || table+"_id";
	return (function(req, res, next) {
		function on_error(msg) {
			req.flash('error', "Virhe tietokannan lukemisessa");
			res.redirect('back');
		}
		
		if(!req[key]) return next("request has no key: " + key);
		
		var where = {};
		where[key] = req[key];
		
		tables[table].select().where(where).limit(1).do(function(err, data) {
			if(err) return next(new WebError('Virhe tietokantayhteydessä. Kokeile hetken kuluttua uudelleen.'));
			var row = data.shift();
			if(!row) return next(new WebError('Tietoja ei löytynyt tietokannasta'));
			req[table+"_id"] = row[table+"_id"];
			req[table] = row;
			next();
		});
	});
}

/* Relink request property also as next key */
function prepRename(next_key, prev_key) {
	var keys = (""+prev_key).split(".");
	console.log('keys = ' + sys.inspect(keys));
	return (function(req, res, next) {
		function lookup(obj) {
			console.log('keys = ' + sys.inspect(keys));
			if(obj !== req) console.log('obj = ' + sys.inspect(obj));
			var k = keys.shift();
			console.log('k = ' + sys.inspect(k));
			if(!k) return obj;
			if(obj[k] && (typeof obj[k] === 'object') ) return lookup(obj[k]);
			console.log('obj[k] = ' + sys.inspect(obj[k]));
			return obj[k];
		}
		req[next_key] = lookup(req);
		console.log('req['+next_key+'] set to ' + sys.inspect(req[next_key]));
		next();
	});
}

/* Update SQL rows */
function updateSQLRow(table, keys) {
	var table = table,
	    keys = keys;
	return (function(req, res, next) {
		if(!table) return next('table missing');
		if(!keys) return next('keys missing');
		
		function on_error(msg) {
			req.flash('error', "Virhe tietokannan lukemisessa");
			res.redirect('back');
		}
		
		var where = {},
		    what = {}, 
		    id_key = table+"_id";
		
		if(!req[id_key]) return next("request has no key: " + id_key);
		where[id_key] = req[id_key];
		
		try {
			foreach(keys).do(function(k) {
				if(!req[k]) throw new Error("request has no key: " + k);
				what[k] = req[k];
			});
		} catch(e) {
			return next(e);
		}
		if(!tables[table]) return next('table missing: ' + table);
		
		util.log('Updating SQL...');
		tables[table].update(what).where(where).limit(1).do(function(err) {
			if(err) return on_error('Virhe tietokantayhteydessä. Kokeile hetken kuluttua uudelleen.');
			req.flash('info', 'Tiedot päivitetty onnistuneesti.');
			next();
		});
	});
}

/* Create authKey */
function createAuthKey(email_key) {
	var email_key = email_key || 'email';
	return (function(req, res, next) {
		var email = req[email_key],
		    user_id = req.user_id;
		if(!user_id) return next("user_id puuttuu");
		activation.create({'user_id':user_id}, function(err, key) {
			if(err) return next('createAuthKey: '+err);
			req.authKey = key;
			next();
		});
	});
}

/* Remove authKey */
function removeAuthKey(key) {
	var key = key || 'authKey';
	return (function(req, res, next) {
		var authKey = req[key];
		if(!authKey) return next("removeAuthKey: missing: "+ key);
		console.log("Removing authKey for " + authKey);
		activation.remove(authKey, function(err, key) {
			if(err) return next('removeAuthKey: '+err);
			console.log("authKey removed.");
			delete req.authKey;
			next();
		});
	});
}

/* Send authKey using email */
function sendEmailAuthKey() {
	return (function(req, res, next) {
		emails.send('./templates/authKey-mail.txt', {'authKey':req.authKey, 'site':site_url},
				{'subject':'Käyttäjätunnuksen vahvistus', 'to':req.email}, function(err) {
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
app.post('/login/reset', prepBodyEmail(), prepSQLRowBy('user', 'email'), createAuthKey(), sendEmailAuthKey(), function(req, res){
	res.redirect('back');
});

/* Display login reset page */
app.get('/login/reset', function(req, res){
	res.render('login/reset', {'title': 'Salasanan vaihtaminen'});
});

/* Handle login process */
app.post('/login', prepLoginAuth(), checkAuth(), function(req, res){
	res.redirect('back');
});

/* Display login page */
app.get('/login', function(req, res){
	res.render('login/index', {title: 'Sisäänkirjautuminen' });
});

/* Display logout page */
app.get('/logout', function(req, res){
	delete req.session.user;
	req.flash('info', 'Olet nyt kirjautunut ulos.');
	res.redirect('back');
});

/* Ask validation from user for authKey */
app.post('/act/:authKey', prepBodyPasswords(), updateSQLRow('user', ['password']), removeAuthKey(), 
	function(req, res, next) {
		req.body.email = req.email;
		req.body.password = req.password;
		next();
	},
	prepLoginAuth('/login'), checkAuth(), function(req, res){
	res.redirect('/profile');
});

/* Ask validation from user for authKey */
app.get('/act/:authKey', function(req, res){
	res.render('act/index.jade', {title: 'Tietojen aktivoiminen', 'authKey':req.authKey, 'email':req.email});
});

/* Game page */
app.get('/game', function(req, res){
	var latest_game = '2011-I';
	res.redirect(site_url+'/game/'+latest_game+'/index');
});

/* User profile page */
app.get('/profile', checkAuth(), function(req, res){
	res.redirect('profile/index');
});

/* User profile page */
app.get('/profile/index', checkAuth(), function(req, res){
	res.render('profile/index', {title: 'Käyttäjätiedot'});
});

/* User profile page */
app.post('/profile/edit', checkAuth(), prepBodyPasswords(), prepRename('user_id', 'session.user.user_id'), updateSQLRow('user', ['password']), function(req, res){
	res.redirect('back');
});

/* User profile page */
app.get('/profile/edit', checkAuth(), function(req, res){
	res.render('profile/edit', {title: 'Muokkaa tietojasi'});
});

/* Game page */
app.get('/game/:gameTag', function(req, res){
	res.redirect(site_url+'/game/'+req.game.tag+'/index');
});

/* Game page */
app.get('/game/:gameTag/index', function(req, res){
	tables.reg.count(function(err, players) {
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
		
		// TODO: FIXME: Split this function into three middlewares: prepEmail, addUserIfNeeded, addReg
		
		tables.user.insert({'game_id':req.game_id, 'email':email}, function(err, user_id) {
			if(err) {
				req.flash('error', 'Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.');
				res.redirect(site_url+'/reg');
				return;
			}
			tables.reg.insert({'game_id':req.game_id, 'user_id':user_id}, function(err) {
				if(err) {
					util.log('Error: '+err);
					req.flash('error', 'Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.');
				} else {
					req.flash('info', 'Sähköpostiosoite lisätty: ' + email);
					req.flash('info', 'Lähetämme erillisen vahvistuksen vielä ennen pelin aloittamista.');
				}
				res.redirect(site_url+'/reg');
			});
		});
		error = false;
	}
	if(error) res.redirect(site_url+'/reg');
});

/* Set port to listen */
app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
