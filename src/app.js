
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
    namespace = require('express-namespace'),
    foreach = require('snippets').foreach,
    trim = require('snippets').trim,
    app = module.exports = express.createServer(),
    tables = require('./tables.js'),
    couchdb = require('./couchdb.js'),
    activation = require('./activation.js'),
    emails = require('./emails.js'),
    FileStore = require('./FileStore.js')(express),
    client;

/* Support for request.work */
express.work = (function (options) {
	return (function(req, res, next) {
		req.work = {};
		next();
	});
});

// Configuration

// Set default umask
process.umask(0077);

params.extend(app);

function WebError(msg, orig){
	this.name = 'WebError';
	this.msg = ""+msg;
	this.orig = orig;
	Error.call(this, ""+msg);
	Error.captureStackTrace(this, arguments.callee);
}

WebError.prototype.__proto__ = Error.prototype;

WebError.prototype.toString = (function() {
	return this.name + ": " + this.msg;
});

app.configure(function(){
	var secret = (config && config.session && config.session.secret) || 'keyboard cat';

	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	
	app.use(express.favicon());
	app.use(express.logger({ format: ':date - :method :status :url' }));
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(express.cookieParser());
	app.use(express.work());
	app.use(express.session({ 'secret':secret, 'store':new FileStore }));
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
	
	app.error(function(err, req, res, next){
		if (!(err instanceof WebError)) return next(err);
		util.log('Error: ' + err.toString() );
		if(err.stack) util.log('Stack: ' + err.stack );
		if(err.orig) util.log('Orig error: ' + err.orig );
		if(err.orig && err.orig.stack) util.log('Orig stack: ' + err.orig.stack );
		req.flash('error', ''+err.msg);
		res.render('error_page.jade', {'title':'Virhe tapahtui'} );
	});
	
});


app.configure('development', function(){
	app.error(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
	app.error(express.errorHandler()); 
});

// Helpers
app.dynamicHelpers({
	session: function(req, res){
		return req.session;
	},
	work: function(req, res){
		return req.work;
	},
	flash: function(req, res) {
		return req.flash();
	},
	param: function(req, res){
		return (function(key, def) {
			return req.param(key, def);
		});
	}
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
		if(err) return next(new WebError('Virheellinen aktivointiavain', err));
		util.log('authKey: authKeyData = ' + sys.inspect(data));
		if(!data.user_id) return next('Virheellinen aktivointidata: user_id puuttuu');
		tables.user.select().where({'user_id':data.user_id}).limit(1).do(function(err, rows) {
			if(err) return next('Virheellinen aktivointidata: tietokantavirhe');
			if(!rows[0]) return next('Virheellinen aktivointidata: user rivi puuttuu');
			if(!req.work) req.work = {};
			req.work.authKey = key;
			req.work.authKeyData = data;
			req.work.user = rows[0];
			req.work.user_id = data.user_id;
			req.work.email = req.work.user['email'];
			next();
		});
	});
});

/* Game Tag */
app.param('gameTag', function(req, res, next, id){
	var game_tag = ""+req.params.gameTag;
	tables.game.select().where({'tag':game_tag}).limit(1).do(function(err, data) {
		if(err) return next(new WebError('Virhe tietokantayhteydessä. Kokeile hetken kuluttua uudelleen.', err));
		if(!data[0]) return next(new WebError('Virheellinen pelin tunniste'));
		req.work.game_id = data[0].game_id;
		req.work.game = data[0];
		next();
	});
});

/* Game Id */
app.param('gameId', function(req, res, next, id){
	var game_id = parseInt(""+req.params.gameId, 10);
	tables.game.select().where({'game_id':game_id}).limit(1).do(function(err, data) {
		if(err) return next(new WebError('Virhe tietokantayhteydessä. Kokeile hetken kuluttua uudelleen.', err));
		if(!data[0]) return next(new WebError('Virheellinen pelin tunniste'));
		req.work.game_id = game_id;
		req.work.game = data;
		next();
	});
});

// Middlewares

/* Validate and prepare login */
function prepLoginAuth(back) {
	var back = back || 'back';
	util.log('prepLoginAuth: start');
	return (function(req, res, next) {
		util.log('prepLoginAuth: call to instance');
		function on_error(msg) {
			req.flash('error', "Kirjautuminen epäonnistui");
			res.redirect(back);
		}
		util.log('prepLoginAuth: req.body = ' + sys.inspect(req.body));
		if(!req.body["email"]) return on_error("missing email");
		if(!req.body["password"]) return on_error("missing password");
		var email = ""+req.body.email,
		    password = ""+req.body.password;
		util.log('prepLoginAuth: Checking auth for email = ' + sys.inspect(email));
		tables.user.authcheck({'email':email, 'password':password}, function(err, valid) {
			if(err) return on_error('Kirjautuminen epäonnistui');
			if(!valid) return on_error('Kirjautuminen epäonnistui');
			util.log('prepLoginAuth: Fetching user data for email = ' + sys.inspect(email));
			tables.user.select().where({'email':email}).limit(1).do(function(err, data) {
				if(err) return on_error('Kirjautuminen epäonnistui');
				if(!data[0]) return on_error('Kirjautuminen epäonnistui');
				delete data[0].password;
				req.session.user = data[0];
				util.log('prepLoginAuth: User logged in as ' + sys.inspect(req.session.user));
				req.flash('info', 'Sisäänkirjautuminen onnistui.');
				next();
			});
		});
	});
}

/* Logout */
function logout() {
	util.log('logout: start');
	return (function(req, res, next) {
		util.log('logout: call to instance');
		delete req.session.user;
		req.flash('info', 'Olet nyt kirjautunut ulos.');
	});
}

/* Check that user has logged in */
function checkAuth() {
	return (function(req, res, next) {
		if(!(req.session && req.session.user)) {
			util.log('checkAuth: failed');
			return next(new WebError("Access Denied"));
		}
		util.log('checkAuth: successful');
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
		req.work[key] = email;
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
		req.work[key1] = pw1;
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
		
		if(!req.work[key]) return next("request has no key: " + key);
		
		var where = {};
		where[key] = req.work[key];
		
		tables[table].select().where(where).limit(1).do(function(err, data) {
			if(err) return next(new WebError('Virhe tietokantayhteydessä. Kokeile hetken kuluttua uudelleen.', err));
			var row = data.shift();
			if(!row) return next(new WebError('Tietoja ei löytynyt tietokannasta'));
			req.work[table+"_id"] = row[table+"_id"];
			req.work[table] = row;
			next();
		});
	});
}

/* Relink request property also as next key */
function prepRename(next_key, prev_key) {
	var keys = (""+prev_key).split(".");
	util.log('prepRename: keys = ' + sys.inspect(keys));
	return (function(req, res, next) {
		function lookup(obj) {
			util.log('prepRename: keys = ' + sys.inspect(keys));
			if(obj !== req) util.log('prepRename: obj = ' + sys.inspect(obj));
			var k = keys.shift();
			util.log('prepRename: k = ' + sys.inspect(k));
			if(!k) return obj;
			if(obj[k] && (typeof obj[k] === 'object') ) return lookup(obj[k]);
			util.log('prepRename: obj[k] = ' + sys.inspect(obj[k]));
			return obj[k];
		}
		req.work[next_key] = lookup(req);
		util.log('prepRename: req.work['+next_key+'] set to ' + sys.inspect(req.work[next_key]));
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
		
		if(!req.work[id_key]) return next("request has no key: " + id_key);
		where[id_key] = req.work[id_key];
		
		try {
			foreach(keys).do(function(k) {
				if(!req.work[k]) throw new TypeError("request has no key: " + k);
				what[k] = req.work[k];
			});
		} catch(e) {
			return next(e);
		}
		if(!tables[table]) return next('table missing: ' + table);
		
		util.log('updateSQLRow: Updating SQL...');
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
		var email = req.work[email_key],
		    user_id = req.work.user_id;
		if(!user_id) return next("user_id puuttuu");
		activation.create({'user_id':user_id}, function(err, key) {
			if(err) return next('createAuthKey: '+err);
			req.work.authKey = key;
			next();
		});
	});
}

/* Remove authKey */
function removeAuthKey(key) {
	var key = key || 'authKey';
	return (function(req, res, next) {
		var authKey = req.work[key];
		if(!authKey) return next("removeAuthKey: missing: "+ key);
		util.log("removeAuthKey: Removing authKey for " + authKey);
		activation.remove(authKey, function(err, key) {
			if(err) return next('removeAuthKey: '+err);
			util.log("removeAuthKey: authKey removed.");
			delete req.work.authKey;
			next();
		});
	});
}

/* Send authKey using email */
function sendEmailAuthKey() {
	return (function(req, res, next) {
		emails.send('./templates/authKey-mail.txt', {'authKey':req.work.authKey, 'site':site_url},
				{'subject':'Käyttäjätunnuksen vahvistus', 'to':req.work.email}, function(err) {
			if(err) {
				util.log('sendEmailAuthKey: Error: ' + err);
				req.flash('error', 'Vahvistusviestin lähetys epäonnistui.');
			} else {
				req.flash('info', 'Vahvistusviesti lähetetty onnistuneesti.');
			}
			next();
		});
	});
}

/* Update information about registration in current game for current user */
function updateUserRegisteredToGame() {
	return (function(req, res, next) {
		try {
			var game_id = req.work.game_id,
			    user_id = req.session && req.session.user && req.session.user.user_id;
			if(!game_id) return next();
			if(!user_id) return next();
			tables.reg.select('COUNT(*) AS count').where({'game_id':game_id, 'user_id':user_id}).limit(1).do(function(err, rows) {
				if(err) return next();
				req.work.userRegisteredToGame = null;
				if(rows && rows[0] && rows[0].count && (rows[0].count === 1)) req.work.userRegisteredToGame = user_id;
				util.log("updateUserRegisteredToGame: work.userRegisteredToGame === " + sys.inspect(req.work.userRegisteredToGame));
				next();
			});
		} catch(e) {
			util.log('updateUserRegisteredToGame: Exception: ' + e + ' [ignored]');
			next();
		}
	});
}

/* Update information about registration in current game for current user */
function updateGameCount() {
	return (function(req, res, next) {
		try {
			if(!req.work.game_id) return next("missing: req.work.game_id");
			tables.reg.select('COUNT(*) AS count').where({'game_id':req.work.game_id}).do(function(err, rows) {
				if(err) req.flash('error', "Tietokantayhteydessä tapahtui virhe: Sivulla voi olla vääriä tietoja.");
				req.work.players = (rows && rows[0] && rows[0].count) || 0;
				req.work.free_players = 126 - req.work.players;
				next();
			});
		} catch(e) {
			util.log('updateGameCount: Exception: ' + e + ' [ignored]');
			next();
		}
	});
}

/* Prepare user data for next request
 * 1) Use current user if logged in,
 * 2) Try to add a new user if not logged in
*/
function prepCurrentUserID(key) {
	var key = key || 'email';
	return (function(req, res, next) {
		
		if(!req.work[key]) return next(new TypeError("addReg: req.work."+key+" was not prepared!"));
		
		// 1) Use current user if logged in
		if(req.session && req.session.user && req.session.user.user_id) {
			req.work.user_id = req.session.user.user_id;
			return next();
		}
		
		// Check if user has registered already but just not logged in, and tell him that.
		
		// 2) Try to add a new user if not logged in
		tables.user.insert({'user_id':req.work.user_id,'email':req.work.email}, function(err, user_id) {
			if(err) return next(WebError('Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.', err));
			req.work.user_id = user_id;
			req.flash('info', 'Käyttäjätunnus lisätty.');
			next();
		});
		
	});
}

/* Do a registration to the game */
function addReg(key) {
	var key = key || 'user_id';
	return (function(req, res, next) {
		if(!req.work['game_id']) return next(new TypeError("addReg: req.work.game_id was not prepared!"));
		if(!req.work[key]) return next(new TypeError("addReg: req.work.user_id was not prepared!"));
		tables.reg.insert({'game_id':req.work.game_id, 'user_id':req.work.user_id}, function(err) {
			if(err) return next(new WebError('Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.', err));
			req.flash('info', 'Teidät on nyt lisätty peliin.');
			next();
		});
	});
}

/* Do unregistration from the game */
function delReg(key) {
	var key = key || 'user_id';
	return (function(req, res, next) {
		if(!req.work['game_id']) return next(new TypeError("addReg: req.work.game_id was not prepared!"));
		if(!req.work[key]) return next(new TypeError("addReg: req.work.user_id was not prepared!"));
		tables.reg.del().where({'game_id':req.work.game_id, 'user_id':req.work.user_id}).limit(1).do(function(err) {
			if(err) return next(new WebError('Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.', err));
			req.flash('info', 'Teidät on nyt poistettu pelistä.');
			next();
		});
	});
}

/* Redirect to somewhere. By default redirects back. */
function redirect(where) {
	var where = where || 'back';
	return (function(req, res, next) {
		res.redirect(where);
	});
}

// Routes

/* Root route */
app.get('/', redirect(site_url+'/game'));
app.get('/ilmo', redirect(site_url+'/game/2011-I'));

/* Login */
app.namespace('/login', function(){

	/* Handle requests for authKey */
	app.post('/reset', prepBodyEmail(), prepSQLRowBy('user', 'email'), createAuthKey(), sendEmailAuthKey(), redirect('back'));
	
	/* Display login reset page */
	app.get('/reset', function(req, res){
		res.render('login/reset', {'title': 'Salasanan vaihtaminen'});
	});
	
	/* Handle login process */
	app.post('/', prepLoginAuth(), checkAuth(), redirect('back'));

	/* Display login page */
	app.get('/', function(req, res){
		res.render('login/index', {title: 'Sisäänkirjautuminen' });
	});
}); // end of /login

/* Logout */
app.get('/logout', logout(), redirect('back'));

/* Email Validations */
app.namespace('/act/:authKey', function(){
	
	/* Ask validation from user for authKey */
	app.get('/', function(req, res){
		res.render('act/index.jade', {title: 'Tietojen aktivoiminen', 'authKey':req.work.authKey, 'email':req.work.email});
	});
	
	/* Hadnle post for validation */
	app.post('/', prepBodyPasswords(), updateSQLRow('user', ['password']), removeAuthKey(), 
		function(req, res, next) {
			req.body.email = req.work.email;
			req.body.password = req.work.password;
			next();
		},
		prepLoginAuth('/login'), checkAuth(), redirect('/profile') );
	
}); // end of /act/:authKey


/* Email Validations */
app.namespace('/profile', function(){
	
	/* User profile page */
	app.get('/', checkAuth(), function(req, res){
		res.redirect('profile/index');
	});
	
	/* User profile page */
	app.get('/index', checkAuth(), function(req, res){
		res.render('profile/index', {title: 'Käyttäjätiedot'});
	});
	
	/* User profile page */
	app.post('/edit', checkAuth(), prepBodyPasswords(), prepRename('user_id', 'session.user.user_id'), updateSQLRow('user', ['password']), redirect('back'));

	/* User profile page */
	app.get('/edit', checkAuth(), function(req, res){
		res.render('profile/edit', {title: 'Muokkaa tietojasi'});
	});

}); // end of /profile

/* Games */
app.namespace('/game', function(){
	
	/* Game list */
	// FIXME: Implement game list if more than one game otherwise move to the only game.
	app.get('/', redirect(site_url+'/game/2011-I/index'));
	
	/* Games */
	app.namespace('/:gameTag', function(){
		
		/* Game page */
		app.get('/', function(req, res){
			res.redirect(site_url+'/game/'+req.work.game.tag+'/index');
		});
		
		/* Game page */
		app.get('/index', updateUserRegisteredToGame(), updateGameCount(), function(req, res){
			res.render('game/reg', {'title': 'Ottelu '+req.work.game.name, players:req.work.players, 'free_players':req.work.free_players});
		});
		
		/* Game page */
		app.get('/reg', updateUserRegisteredToGame(), updateGameCount(), function(req, res){
			res.render('game/reg', {'title':'Ottelu '+req.work.game.name});
		});
		
		/* Handle unregistration request */
		app.get('/unreg', checkAuth(), updateUserRegisteredToGame(), function(req, res){
			res.render('game/unreg', {'title':'Ottelu '+req.work.game.name});
		});
		
		/* Handle unregistration request */
		app.post('/unreg', prepBodyEmail(), checkAuth(), prepCurrentUserID(), delReg(), redirect('back'));
		
		/* Handle registration request */
		app.post('/reg', prepBodyEmail(), prepCurrentUserID(), addReg(), redirect('back'));
		
	}); // end of /game/:gameTag
	
}); // end of /game

/* Set port to listen */
app.listen(3000);
util.log("main: Express server listening on port "+app.address().port+" in "+app.settings.env+" mode");

/* EOF */
