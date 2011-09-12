
/**
 * Module dependencies.
 */

/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, __filename: false, __dirname: false */

var express = require('express'),
    params = require('express-params'),
    request = require('request'),
	config = require('./config.js'),
	site_url = config.url || 'http://game.freeciv.fi',
    sys = require('sys'),
    core = require('./core.js'),
    util = require('util'),
    sql = require('./sqlmw.js'),
    namespace = require('express-namespace'),
    foreach = require('snippets').foreach,
    trim = require('snippets').trim,
    app = module.exports = express.createServer(),
    tables = require('./tables.js'),
    couchdb = require('./couchdb.js'),
    activation = require('./activation.js'),
    emails = require('./emails.js'),
    freeciv = require('./freeciv.js'),
    FileStore = require('./FileStore.js')(express),
    WebError = require('./WebError.js'),
    client;

/* Support for request.work */
express.work = function (options) {
	return function(req, res, next) {
		try {
			req.work = {};
		} catch(e) {
			next(e||new TypeError('Error'));
			return;
		}
		next();
	};
};

/* Support for request.freeciv */
express.freeciv = function (options) {
	return function(req, res, next) {
		try {
			freeciv.data( __dirname + '/../freeciv.json', function(err, data) {
				try {
					req.freeciv = err ? {} : data;
					if(err) {
						throw err;
					}
				} catch(e) {
					next(e||new TypeError('Error'));
					return;
				}
				next();
			});
		} catch(e) {
			next(e||new TypeError('Error'));
		}
	};
};

// Configuration

// Set default umask
process.umask(77);

params.extend(app);

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
	app.use(express.freeciv());
	app.use(express.session({ 'secret':secret, 'store':new FileStore() }));
	app.use(app.router);
	app.use(express['static'](__dirname + '/public'));
	
	app.error(function(err, req, res, next){
		try {
			if (!(err instanceof WebError)) {
				throw err;
			}
			util.log('Error: ' + err.toString() );
			if(err.stack) {
				util.log('Stack: ' + err.stack );
			}
			if(err.orig) {
				util.log('Orig error: ' + err.orig );
			}
			if(err.orig && err.orig.stack) {
				util.log('Orig stack: ' + err.orig.stack );
			}
			req.flash('error', ''+err.msg);
			res.render('error_page.jade', {'title':'Virhe tapahtui'} );
		} catch(e) {
			next(e||new TypeError('Error'));
		}
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
	freeciv: function(req, res){
		return req.freeciv;
	},
	flash: function(req, res) {
		return req.flash();
	},
	param: function(req, res){
		return function(key, def) {
			return req.param(key, def);
		};
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
	try {
		var key = ""+req.params.authKey;
		activation.test(key, function(err, data) {
			try {
				if(err) {
					throw new WebError('Virheellinen aktivointiavain', err);
				}
				util.log('authKey: authKeyData = ' + sys.inspect(data));
				if(!data.user_id) {
					throw new Error('Virheellinen aktivointidata: user_id puuttuu');
				}
				tables.user.select().where({'user_id':data.user_id}).limit(1).exec(function(err, rows) {
					try {
						if(err) {
							throw new Error('Virheellinen aktivointidata: tietokantavirhe');
						}
						if(!rows[0]) {
							throw new Error('Virheellinen aktivointidata: user rivi puuttuu');
						}
						req.work.authKey = key;
						req.work.authKeyData = data;
						req.work.user = rows[0];
						req.work.user_id = data.user_id;
						req.work.email = req.work.user.email;
					} catch(e) {
						next(e||new TypeError('Error'));
						return;
					}
					next();
				});
			} catch(e) {
				next(e||new TypeError('Error'));
			}
		});
	} catch(e) {
		next(e||new TypeError('Error'));
	}
});

/* Game Tag */
app.param('gameTag', function(req, res, next, id){
	try {
		var game_tag = ""+req.params.gameTag;
		tables.game.select().where({'tag':game_tag}).limit(1).exec(function(err, data) {
			try {
				if(err) {
					throw new WebError('Virhe tietokantayhteydessä. Kokeile hetken kuluttua uudelleen.', err);
				}
				if(!data[0]) {
					throw new WebError('Virheellinen pelin tunniste');
				}
				req.work.game_id = data[0].game_id;
				req.work.game = data[0];
			} catch(e) {
				next(e||new TypeError('Error'));
				return;
			}
			next();
		});
	} catch(e) {
		next(e||new TypeError('Error'));
	}
});

/* Game Id */
app.param('gameId', function(req, res, next, id){
	try {
		var game_id = parseInt(""+req.params.gameId, 10);
		tables.game.select().where({'game_id':game_id}).limit(1).exec(function(err, data) {
			try {
				if(err) {
					throw new WebError('Virhe tietokantayhteydessä. Kokeile hetken kuluttua uudelleen.', err);
				}
				if(!data[0]) {
					throw new WebError('Virheellinen pelin tunniste');
				}
				req.work.game_id = game_id;
				req.work.game = data;
			} catch(e) {
				next(e||new TypeError('Error'));
				return;
			}
			next();
		});
	} catch(e) {
		next(e||new TypeError('Error'));
	}
});

// Middlewares

/* Setup core user data */
function setupCoreUser() {
	util.log('setupCoreUser: start');
	return function(req, res, next) {
		try {
			if(!req.work.raw_password) {
				next();
				return;
			}
			core.setupUser( 
				(function() {
					var obj = {};
					foreach(req.session.user).each(function(v, k) {
						obj[k] = v;
					});
					obj.raw_password = req.work.raw_password;
					return obj;
				}()),
				function(err) {
					if(err) {
						util.log('Error in setupCoreUser: ' + sys.inspect(err) + " [ignored]");
					}
					next();
				});
		} catch(e) {
			next(e||new TypeError('Error'));
		}
	};
}

/* Validate and prepare login */
function prepLoginAuth() {
	util.log('prepLoginAuth: start');
	return function(req, res, next) {
		try {
			util.log('prepLoginAuth: call to instance');
			util.log('prepLoginAuth: req.body = ' + sys.inspect(req.body));
			if(!req.body.email) {
				throw new WebError("Kirjautuminen epäonnistui");
			}
			if(!req.body.password) {
				throw new WebError("Kirjautuminen epäonnistui");
			}
			var email = ""+req.body.email,
			    password = ""+req.body.password;
			util.log('prepLoginAuth: Checking auth for email = ' + sys.inspect(email));
			tables.user.authcheck({'email':email, 'password':password}, function(err, valid) {
				try {
					if(err) {
						throw new WebError('Kirjautuminen epäonnistui', err);
					}
					if(!valid) {
						throw new WebError('Kirjautuminen epäonnistui');
					}
					util.log('prepLoginAuth: Fetching user data for email = ' + sys.inspect(email));
					tables.user.select().where({'email':email}).limit(1).exec(function(err, data) {
						try {
							if(err) {
								throw new WebError('Kirjautuminen epäonnistui', err);
							}
							if(!data[0]) {
								throw new WebError('Kirjautuminen epäonnistui');
							}
							var raw_password = data[0].password;
							delete data[0].password;
							req.session.user = data[0];
							util.log('prepLoginAuth: User logged in as ' + sys.inspect(req.session.user));
							req.flash('info', 'Sisäänkirjautuminen onnistui.');
							req.work.raw_password = raw_password;
						} catch(e) {
							next(e||new TypeError('Error'));
							return;
						}
						next();
					});
				} catch(e) {
					next(e||new TypeError('Error'));
				}
			});
		} catch(e) {
			next(e||new TypeError('Error'));
		}
	};
}

/* Logout */
function logout() {
	util.log('logout: start');
	return function(req, res, next) {
		try {
			util.log('logout: call to instance');
			delete req.session.user;
			req.flash('info', 'Olet nyt kirjautunut ulos.');
		} catch(e) {
			next(e||new TypeError('Error'));
			return;
		}
		next();
	};
}

/* Check that user has logged in */
function checkAuth() {
	return function(req, res, next) {
		try {
			if(!(req.session && req.session.user)) {
				throw new WebError("Tämä toiminto vaatii sisäänkirjautumisen.", 'checkAuth: failed');
			}
			util.log('checkAuth: successful');
		} catch(e) {
			next(e||new TypeError('Error'));
			return;
		}
		next();
	};
}

/* Validate and prepare email keyword */
function prepBodyEmail(key) {
	key = key || 'email';
	return function(req, res, next) {
		try {
			if(!req.body[key]) {
				throw new WebError("Sähköpostiosoite puuttuu");
			}
			var email = trim(""+req.body[key]);
			if(email.length === 0) {
				throw new WebError("Sähköpostiosoite on tyhjä");
			}
			if(!email.match('@')) {
				throw new WebError("Ei ole toimiva: " + email);
			}
			req.work[key] = email;
		} catch(e) {
			next(e||new TypeError('Error'));
			return;
		}
		next();
	};
}

/* Validate and prepare password keywords */
function prepBodyPasswords(key1, key2) {
	key1 = key1 || 'password';
	key2 = key2 || 'password2';
	return function(req, res, next) {
		try {
			if(!(req.body[key1] && req.body[key2])) {
				throw new WebError("Toinen salasanoista puuttuu");
			}
			var pw1 = ""+req.body[key1],
			    pw2 = ""+req.body[key2];
			if(pw1.length < 8) {
				throw new WebError("Salasanan tulee olla vähintään kahdeksan (8) merkkiä pitkä");
			}
			if(pw1 !== pw2) {
				throw new WebError("Salasanat eivät vastaa toisiaan");
			}
			req.work[key1] = pw1;
			req.work.raw_password = pw1;
		} catch(e) {
			next(e||new TypeError('Error'));
			return;
		}
		next();
	};
}

/* Validate and prepare name keyword */
function prepBodyName(key1) {
	key1 = key1 || 'name';
	return function(req, res, next) {
		try {
			if( (!req.body[key1])  ) {
				next();
				return;
			}
			if(req.session.user.name) {
				next();
				return;
			}
			var name = trim(""+req.body[key1]).toLowerCase();
			if(name.length < 3) {
				throw new WebError("Käyttäjätunnuksen tulee olla vähintään kolme (3) ja korkeintaan 32 merkkiä pitkä");
			}
			if(name.length >= 32) {
				throw new WebError("Käyttäjätunnuksen tulee olla vähintään kolme (3) ja korkeintaan 32 merkkiä pitkä");
			}
			if(!name.match(/^[a-z][a-z0-9\_]+$/)) {
				throw new WebError("Käyttäjätunnus ei saa sisältää muita merkkejä kuin a-z, 0-9 tai alaviivan (_). Ensimmäinen merkki tulee olla a-z.");
			}
			req.work[key1] = name;
		} catch(e) {
			next(e||new TypeError('Error'));
			return;
		}
		next();
	};
}

/* Validate and prepare data by keyword */
function prepSQLRowBy(table, key) {
	table = table || 'user';
	key = key || table+"_id";
	return function(req, res, next) {
		try {
			if(!req.work[key]) {
				throw new Error("request has no key: " + key);
			}
			
			var where = {};
			where[key] = req.work[key];
			
			tables[table].select().where(where).limit(1).exec(function(err, data) {
				try {
					if(err) {
						throw new WebError('Virhe tietokantayhteydessä. Kokeile hetken kuluttua uudelleen.', err);
					}
					var row = data.shift();
					if(!row) {
						throw new WebError('Tietoja ei löytynyt tietokannasta');
					}
					req.work[table+"_id"] = row[table+"_id"];
					req.work[table] = row;
				} catch(e) {
					next(e||new TypeError('Error'));
					return;
				}
				next();
			});
		} catch(e) {
			next(e||new TypeError('Error'));
		}
	};
}

/* Relink request property also as next key */
function prepRename(next_key, prev_key) {
	var keys = (""+prev_key).split(".");
	util.log('prepRename: keys = ' + sys.inspect(keys));
	return function(req, res, next) {
		try {
			function lookup(obj) {
				util.log('prepRename: keys = ' + sys.inspect(keys));
				if(obj !== req) {
					util.log('prepRename: obj = ' + sys.inspect(obj));
				}
				var k = keys.shift();
				util.log('prepRename: k = ' + sys.inspect(k));
				if(!k) {
					return obj;
				}
				if(obj[k] && (typeof obj[k] === 'object') ) {
					return lookup(obj[k]);
				}
				util.log('prepRename: obj[k] = ' + sys.inspect(obj[k]));
				return obj[k];
			}
			req.work[next_key] = lookup(req);
			util.log('prepRename: req.work['+next_key+'] set to ' + sys.inspect(req.work[next_key]));
		} catch(e) {
			next(e||new TypeError('Error'));
			return;
		}
		next();
	};
}

/* Update SQL rows */
function updateSQLRow(table, keys) {
	return function(req, res, next) {
		try {
			if(!table) {
				throw new Error('table missing');
			}
			if(!keys) {
				throw new Error('keys missing');
			}
			
			var where = {},
			    what = {}, 
			    id_key = table+"_id",
			    changes = 0;
			
			if(!req.work[id_key]) {
				throw new Error("request has no key: " + id_key);
			}
			where[id_key] = req.work[id_key];
			
			try {
				foreach(keys).each(function(k) {
					if(req.work[k] !== undefined) {
						console.log('what[' + sys.inspect(k) + '] = ' + sys.inspect(req.work[k]));
						what[k] = req.work[k];
						changes += 1;
					}
				});
			} catch(e) {
				next(e||new TypeError('Error'));
				return;
			}
			if(!tables[table]) {
				throw new Error('table missing: ' + table);
			}
			
			if(changes === 0) {
				next();
				return;
			}
			
			util.log('updateSQLRow: Updating SQL...');
			tables[table].update(what).where(where).limit(1).exec(function(err) {
				try {
					if(err) {
						throw new WebError('Virhe tietokantayhteydessä. Kokeile hetken kuluttua uudelleen.', err);
					}
					req.flash('info', 'Tiedot päivitetty onnistuneesti.');
				} catch(e) {
					next(e||new TypeError('Error'));
					return;
				}
				next();
			});
		} catch(e2) {
			next(e2||new TypeError('Error'));
		}
	};
}

/* Create authKey */
function createAuthKey(email_key) {
	email_key = email_key || 'email';
	return function(req, res, next) {
		try {
			var email = req.work[email_key],
			    user_id = req.work.user_id;
			if(!user_id) {
				throw new Error("user_id puuttuu");
			}
			activation.create({'user_id':user_id}, function(err, key) {
				try {
					if(err) {
						throw new Error('createAuthKey: '+err);
					}
					req.work.authKey = key;
				} catch(e) {
					next(e||new TypeError('Error'));
					return;
				}
				next();
			});
		} catch(e) {
			next(e||new TypeError('Error'));
		}
	};
}

/* Remove authKey */
function removeAuthKey(key) {
	key = key || 'authKey';
	return function(req, res, next) {
		try {
			var authKey = req.work[key];
			if(!authKey) {
				throw new Error("removeAuthKey: missing: "+ key);
			}
			req.on('end', function() {
				try {
					util.log("removeAuthKey: Removing authKey for " + authKey);
					activation.remove(authKey, function(err, key) {
						try {
							if(err) {
								util.log('removeAuthKey: '+err);
								return;
							}
							util.log("removeAuthKey: authKey removed.");
							delete req.work.authKey;
						} catch(e) {
							util.log('Exception: '+e);
						}
					});
				} catch(e) {
					util.log('Exception: '+e);
				}
			});
		} catch(e) {
			next(e||new TypeError('Error'));
			return;
		}
		next();
	};
}

/* Send authKey using email */
function sendEmailAuthKey(soft) {
	return function(req, res, next) {
		try {
			if(soft) {
				if(!req.work.authKey) {
					throw "";
				}
				if(!req.work.email) {
					throw "";
				}
			}
			emails.send('./templates/authKey-mail.txt', {'authKey':req.work.authKey, 'site':site_url},
					{'subject':'Käyttäjätunnuksen vahvistus', 'to':req.work.email}, function(err) {
				try {
					if(err) {
						util.log('sendEmailAuthKey: Error: ' + err);
						req.flash('error', 'Vahvistusviestin lähetys epäonnistui.');
					} else {
						req.flash('info', 'Vahvistusviesti lähetetty onnistuneesti.');
					}
				} catch(e){
					next(e||new TypeError('Error'));
					return;
				}
				next();
			});
		} catch(e) {
			if(e === "") {
				next();
				return;
			}
			next(e||new TypeError('Error'));
		}
	};
}

/* Update information about registration in current game for current user */
function updateUserRegisteredToGame() {
	return function(req, res, next) {
		try {
			var game_id = req.work.game_id,
			    user_id = req.session && req.session.user && req.session.user.user_id;
			if(!game_id) {
				throw "";
			}
			if(!user_id) {
				throw "";
			}
			tables.reg.select('*').where({'game_id':game_id, 'user_id':user_id}).limit(1).exec(function(err, rows) {
				try {
					if(err) {
						throw err;
					}
					req.work.userRegisteredToGame = undefined;
					if(rows && rows[0] && rows[0].reg_id) {
						req.work.userRegisteredToGame = user_id;
						req.work.reg_id = rows[0].reg_id;
						req.work.reg = rows[0];
					}
					util.log("updateUserRegisteredToGame: work.userRegisteredToGame === " + sys.inspect(req.work.userRegisteredToGame));
				} catch(e) {
					if(e) {
						util.log('updateUserRegisteredToGame: Exception: ' + e + ' [ignored]');
					}
				}
				next();
			});
		} catch(e) {
			if(e === "") {
				next();
				return;
			}
			next(e||new TypeError('Error'));
		}
	};
}

/* Update information about registration in current game for current user */
function updateGameCount() {
	return function(req, res, next) {
		try {
			if(!req.work.game_id) {
				throw Error("missing: req.work.game_id");
			}
			var game_count = sql.group(
				sql.connect(),
				sql.query(
					'SELECT COUNT(*) AS count'+
					' FROM reg AS r'+
					" WHERE r.game_id = :game_id")
			);
			game_count({'game_id':req.work.game_id}, function(err, result) {
				try {
					if(err) {
						req.flash('error', "Tietokantayhteydessä tapahtui virhe: Sivulla voi olla vääriä tietoja.");
					}
					var rows = result && result._rows;
					req.work.players = (rows && rows[0] && rows[0].count) || 0;
					req.work.free_players = (req.work.players >= 126) ? 0 : (126 - req.work.players);
					req.work.spare_players = (req.work.players >= 126) ? req.work.players - 126 : 0;
					req.work.game_players = (req.work.players >= 126) ? 126 : req.work.players;
				} catch(e) {
					util.log('updateGameCount: Exception: ' + e + ' [ignored]');
				}
				next();
			});
		} catch(e) {
			util.log('updateGameCount: Exception: ' + e + ' [ignored]');
			next();
		}
	};
}

/* Update information about registration in current game for current user */
function updateGamePlayerList() {
	return function(req, res, next) {
		try {
			req.work.players = [];
			if(!req.work.game_id) {
				throw Error("missing: req.work.game_id");
			}
			var list_game_players = sql.group(
				sql.connect(),
				sql.query(
					'SELECT r.number, p.*, a.name AS username, u.name AS game_username'+
					' FROM reg AS r '+
					' LEFT JOIN player AS p ON r.reg_id=p.reg_id '+
					' LEFT JOIN user AS u ON r.user_id=u.user_id '+
					' LEFT JOIN auth AS a ON (r.user_id=a.user_id AND r.game_id=a.game_id) '+
					" WHERE r.game_id = :game_id"+
					' ORDER BY r.number')
			);
			list_game_players({'game_id':req.work.game_id}, function(err, state) {
				try {
					if(err) {
						req.flash('error', "Tietokantayhteydessä tapahtui virhe: Sivulla voi olla vääriä tietoja.");
					}
					if(state && state._rows) {
						req.work.players = state._rows;
					}
				} catch(e) {
					util.log('updateGamePlayerList: Exception: ' + e + ' [ignored]');
				}
				next();
			});
		} catch(e) {
			util.log('updateGamePlayerList: Exception: ' + e + ' [ignored]');
			next();
		}
	};
}

/* Prepare user data for next request
 * 1) Use current user if logged in,
 * 2) Try to add a new user if not logged in
*/
function prepCurrentUserID(key) {
	key = key || 'email';
	return function(req, res, next) {
		try {
			// 1) Use current user if logged in
			if(req.session && req.session.user && req.session.user.user_id) {
				req.work.user_id = req.session.user.user_id;
				throw "";
			}
			
			if(!req.work[key]) {
				throw new TypeError("prepCurrentUserID: req.work."+key+" was not prepared!");
			}
			
			// Check if user has registered already but just not logged in, and tell him that.
			tables.user.select('COUNT(*) AS count').where({'email':req.work.email}).exec(function(err, rows) {
				
				var count = rows && rows[0] && rows[0].count;
				
				if(count > 0) {
					next(new WebError('Tämä sähköpostiosoite löytyy jo järjestelmästä. Voit rekisteröityä peliin sisäänkirjautumisen jälkeen.'));
					return;
				}
				
				// 2) Try to add a new user if not logged in
				util.log('Creating user with email ' + req.work.email);
				tables.user.insert({'email':req.work.email}, function(err, user_id) {
					try {
						if(err) {
							throw WebError('Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.', err);
						}
						util.log('Created user #' + user_id);
						req.work.user_id = user_id;
						req.flash('info', 'Käyttäjätunnus lisätty.');
					} catch(e) {
						next(e||new TypeError('Error'));
						return;
					}
					next();
				});
				
			});
			
		} catch(e) {
			if(e === "") {
				next();
			} else {
				next(e||new TypeError('Error'));
			}
		}
	};
}

/* Do a registration to the game */
function addReg(key) {
	key = key || 'user_id';
	return function(req, res, next) {
		try {
			if(!req.work.game_id) {
				throw new TypeError("addReg: req.work.game_id was not prepared!");
			}
			if(!req.work[key]) {
				throw new TypeError("addReg: req.work.user_id was not prepared!");
			}
			tables.reg.select('MAX(number)+1 AS number').where({'game_id':req.work.game_id}).exec(function(err, data) {
				try {
					if(err) {
						throw new WebError('Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.', err);
					}
					var number = data && data[0] && data[0].number;
					tables.reg.insert({'game_id':req.work.game_id, 'user_id':req.work.user_id, 'number':number}, function(err) {
						try {
							if(err) {
								throw new WebError('Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.', err);
							}
							req.flash('info', 'Teidät on nyt lisätty peliin.');
						} catch(e) {
							next(e||new TypeError('Error'));
							return;
						}
						next();
					});
				} catch(e) {
					next(e||new TypeError('Error'));
				}
			});
		} catch(e) {
			next(e||new TypeError('Error'));
		}
	};
}

/* Do unregistration from the game */
function delReg(key) {
	key = key || 'user_id';
	return function(req, res, next) {
		try {
			if(!req.work.game_id) {
				throw new TypeError("delReg: req.work.game_id was not prepared!");
			}
			if(!req.work[key]) {
				throw new TypeError("delReg: req.work.user_id was not prepared!");
			}
			tables.reg.del().where({'game_id':req.work.game_id, 'user_id':req.work.user_id}).limit(1).exec(function(err) {
				try {
					if(err) {
						throw new WebError('Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.', err);
					}
					req.flash('info', 'Pelivaraus on nyt poistettu.');
				} catch(e) {
					next(e||new TypeError('Error'));
					return;
				}
				next();
			});
		} catch(e) {
			next(e||new TypeError('Error'));
		}
	};
}

/* Unregister player data from the game */
function delPlayer() {
	return function(req, res, next) {
		try {
			if(!req.work.game_id) {
				throw new TypeError("delPlayer: req.work.game_id was not prepared!");
			}
			if(!req.work.reg_id) {
				throw "";
			}
			tables.player.del().where({'game_id':req.work.game_id, 'reg_id':req.work.reg_id}).limit(1).exec(function(err) {
				try {
					if(err) {
						throw new WebError('Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.', err);
					}
					req.flash('info', 'Teidät on poistettu pelistä.');
				} catch(e) {
					next(e||new TypeError('Error'));
					return;
				}
				next();
			});
		} catch(e) {
			if(e === "") {
				next();
			} else {
				next(e||new TypeError('Error'));
			}
		}
	};
}

/* Redirect to somewhere. By default redirects back. */
function redirect(where) {
	where = where || 'back';
	return function(req, res, next) {
		try {
			res.redirect(where);
		} catch(e) {
			next(e||new TypeError('Error'));
		}
	};
}

/* Prepare data to request.work.reg */
function prepRegData() {
	return function(req, res, next) {
		try {
			if(!req.work.game_id) {
				throw new TypeError("prepRegData: req.work.game_id was not prepared!");
			}
			if(!req.work.user_id) {
				throw new TypeError("prepRegData: req.work.user_id was not prepared!");
			}
			tables.reg.select('*').where({'game_id':req.work.game_id, 'user_id':req.work.user_id}).limit(1).exec(function(err, rows) {
				try {
					if(err) {
						throw new WebError('Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.', err);
					}
					if(!(rows && rows[0])) {
						throw new WebError('Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.', err);
					}
					req.work.reg_id = rows[0].reg_id;
					req.work.reg = rows[0];
				} catch(e) {
					next(e||new TypeError('Error'));
					return;
				}
				next();
			});
		} catch(e) {
			next(e||new TypeError('Error'));
		}
	};
}

/* Prepare data to request.work.reg */
function prepPlayerData() {
	return function(req, res, next) {
		try {
			if(!req.work.game_id) {
				throw new TypeError("prepPlayerData: req.work.game_id was not prepared!");
			}
			if(!req.work.reg_id) {
				throw "";
			}
			tables.player.select('*').where({'game_id':req.work.game_id, 'reg_id':req.work.reg_id}).limit(1).exec(function(err, rows) {
				try {
					if(err) {
						throw new WebError('Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.', err);
					}
					if(!(rows && rows[0])) {
						throw "";
					}
					req.work.player_id = rows[0].player_id;
					req.work.player = rows[0];
				} catch(e) {
					if(e === "") {
						next();
					} else {
						next(e||new TypeError('Error'));
					}
					return;
				}
				next();
			});
		} catch(e) {
			if(e === "") {
				next();
			} else {
				next(e||new TypeError('Error'));
			}
		}
	};
}

/* Prepare data to request.work.reg */
function prepPlayerAuthData() {
	return function(req, res, next) {
		try {
			if(!req.work.game_id) {
				throw new TypeError("prepPlayerAuthData: req.work.game_id was not prepared!");
			}
			var user_id = req.session && req.session.user && req.session.user.user_id;
			tables.auth.select('*').where({'game_id':req.work.game_id, 'user_id':user_id}).limit(1).exec(function(err, rows) {
				try {
					if(err) {
						throw new WebError('Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.', err);
					}
					if(!(rows && rows[0])) {
						throw "";
					}
					req.work.auth_id = rows[0].auth_id;
					req.work.auth = rows[0];
				} catch(e) {
					if(e === "") {
						next();
					} else {
						next(e||new TypeError('Error'));
					}
					return;
				}
				next();
			});
		} catch(e) {
			if(e === "") {
				next();
			} else {
				next(e||new TypeError('Error'));
			}
		}
	};
}

/* Setup player */
function setupPlayer(key) {
	return function(req, res, next) {
		try {
			var nation = trim(""+req.body.nation),
			    name = trim(""+req.body.name);
			if(nation.length === 0) {
				throw new WebError('Kansallisuus valitsematta');
			}
			if(name.length === 0) {
				throw new WebError('Hallitsijan nimi valitsematta');
			}
			if(!req.work.game_id) {
				throw new TypeError("setupPlayer: req.work.player_id was not prepared!");
			}
			if(!req.work.reg_id) {
				throw new TypeError("setupPlayer: req.work.reg_id was not prepared!");
			}
			tables.player.select('*').where({'game_id':req.work.game_id, 'reg_id':req.work.reg_id}).limit(1).exec(function(err, rows) {
				try {
					if(err) {
						throw new WebError('Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.', err);
					}
					if(rows && rows[0] && rows[0].player_id) {
						tables.player.update({'name':name, 'nation':nation}).where({'player_id':rows[0].player_id}).limit(1).exec(function(err) {
							try {
								if(err) {
									throw new WebError('Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.', err);
								}
								req.work.player_id = rows[0].player_id;
								req.flash('info', 'Pelaajan tiedot päivitetty.');
							} catch(e) {
								next(e||new TypeError('Error'));
								return;
							}
							next();
						});
					} else {
						tables.player.insert({'game_id':req.work.game_id, 'reg_id':req.work.reg_id, 'name':name, 'nation':nation}, function(err, player_id) {
							try {
								if(err) {
									throw new WebError('Virhe tietokantayhteydessä. Yritä hetken kuluttua uudelleen.', err);
								}
								req.work.player_id = player_id;
								req.flash('info', 'Pelaajan tiedot lisätty.');
							} catch(e) {
								next(e||new TypeError('Error'));
								return;
							}
							next();
						});
					}
				} catch(e) {
					next(e||new TypeError('Error'));
				}
			});
		} catch(e) {
			next(e||new TypeError('Error'));
		}
	};
}

/* Setup player */
function prepFreecivData(key) {
	return function(req, res, next) {
		try {
			tables.player.select().where({'game_id':req.work.game_id}).exec(function(err, rows) {
				try {
					var free_nations = [], reserved=[];
					if(err) {
						throw new WebError("Virhe tietokantayhteydessä");
					}
					
					if(rows) {
						foreach(rows).each(function(player) {
							reserved.push(player.nation);
						});
					}
					
					foreach(req.freeciv.nations).each(function(nation) {
						var is_reserved = false;
						// FIXME: This next foreach isn't optimal!
						foreach(reserved).each(function(n) {
							if(nation.name === n) {
								is_reserved = true;
							}
						});
						if(is_reserved) {
							return;
						}
						free_nations.push(nation);
					});
					
					req.work.free_nations = free_nations;
				} catch(e) {
					next(e||new TypeError('Error'));
					return;
				}
				next();
			});
		} catch(e) {
			next(e||new TypeError('Error'));
		}
	};
}

// Routes

/* Root route */
app.get('/', redirect(site_url+'/game'));
app.get('/ilmo', redirect(site_url+'/game/2011-I'));

/* Login */
app.namespace('/login', function(){

	/* Handle requests for authKey */
	app.post('/reset', prepBodyEmail(), prepSQLRowBy('user', 'email'), createAuthKey(), sendEmailAuthKey(), redirect(site_url+'/'));
	
	/* Display login reset page */
	app.get('/reset', function(req, res){
		res.render('login/reset', {'title': 'Salasanan vaihtaminen'});
	});
	
	/* Handle login process */
	app.post('/', prepLoginAuth(), setupCoreUser(), checkAuth(), redirect(site_url+'/'));

	/* Display login page */
	app.get('/', function(req, res){
		res.render('login/index', {title: 'Sisäänkirjautuminen' });
	});
}); // end of /login

/* Logout */
app.get('/logout', logout(), redirect(site_url+'/'));

/* Email Validations */
app.namespace('/act/:authKey', function(){
	
	/* Ask validation from user for authKey */
	app.get('/', function(req, res){
		res.render('act/index.jade', {title: 'Tietojen aktivoiminen', 'authKey':req.work.authKey, 'email':req.work.email});
	});
	
	/* Hadnle post for validation */
	app.post('/', prepBodyPasswords(), updateSQLRow('user', ['password']), removeAuthKey(), 
		function(req, res, next) {
			try {
				req.body.email = req.work.email;
				req.body.password = req.work.password;
			} catch(e) {
				next(e||new TypeError('Error'));
				return;
			}
			next();
		},
		prepLoginAuth('/login'), setupCoreUser(), checkAuth(), redirect(site_url+'/profile') );
	
}); // end of /act/:authKey


/* Email Validations */
app.namespace('/profile', function(){
	
	/* User profile page */
	app.get('/', checkAuth(), function(req, res){
		res.redirect(site_url+'/profile/index');
	});
	
	/* User profile page */
	app.get('/index', checkAuth(), function(req, res){
		res.render('profile/index', {title: 'Käyttäjätiedot'});
	});
	
	/* User profile page */
	app.post('/edit', checkAuth(), prepBodyPasswords(), prepBodyName(), 
		prepRename('user_id', 'session.user.user_id'), updateSQLRow('user', ['password', 'name']), 
		function(req, res, next){
			if(req.session && req.session.user && (!req.session.user.name) && req.work.name) {
				req.session.user.name = req.work.name;
			}
			next();
		},
		setupCoreUser(),
		redirect(site_url+'/profile'));
	
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
		app.get('/index', updateUserRegisteredToGame(), prepPlayerData(), prepPlayerAuthData(), updateGameCount(), updateGamePlayerList(), function(req, res){
			res.render('game/reg', {'title': 'Ottelu '+req.work.game.name, players:req.work.players, 'free_players':req.work.free_players});
		});
		
		/* Game page */
		app.get('/lua', updateUserRegisteredToGame(), prepPlayerData(), prepPlayerAuthData(), updateGameCount(), updateGamePlayerList(), function(req, res){
			res.render('game/lua', {'title': 'Ottelu '+req.work.game.name, players:req.work.players, 'free_players':req.work.free_players});
		});
		
		/* Game page */
		app.get('/reg', updateUserRegisteredToGame(), prepPlayerData(), prepPlayerAuthData(), updateGameCount(), updateGamePlayerList(), function(req, res){
			res.render('game/reg', {'title':'Ottelu '+req.work.game.name});
		});
		
		/* Handle registration request */
		app.post('/reg', prepBodyEmail(), prepCurrentUserID(), addReg(), updateUserRegisteredToGame(), createAuthKey(), sendEmailAuthKey(true), redirect(site_url+'/'));
		
		/* Handle unregistration request */
		app.get('/unreg', checkAuth(), updateUserRegisteredToGame(), prepPlayerData(), prepPlayerAuthData(), function(req, res){
			res.render('game/unreg', {'title':'Poista pelaaja - Ottelu '+req.work.game.name});
		});
		
		/* Handle unregistration request */
		app.post('/unreg', prepBodyEmail(), checkAuth(), prepCurrentUserID(), delPlayer(), delReg(), redirect(site_url+'/'));
		
		/* Handle unregistration request */
		app.get('/setup', checkAuth(), updateUserRegisteredToGame(), prepPlayerData(), prepPlayerAuthData(), prepFreecivData(), function(req, res){
			res.render('game/setup', {'title':'Muokkaa pelaajan tietoja - Ottelu '+req.work.game.name});
		});
		
		/* Handle setup request */
		app.post('/setup', checkAuth(), prepCurrentUserID(), prepRegData(), setupPlayer(), function(req, res){
			res.redirect(site_url+'/game/'+req.work.game.tag+'/index');
		});
		
	}); // end of /game/:gameTag
	
}); // end of /game

/* Set port to listen */
app.listen(config.port || 3000);
util.log("main: Express server listening on port "+app.address().port+" in "+app.settings.env+" mode");

/* EOF */
