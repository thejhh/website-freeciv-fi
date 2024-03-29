/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */


/**
 * Module dependencies.
 */

/* FIXME: update expiration so that the session does not expire when user is using the system! */

var sys = require('sys'),
    fs = require('fs');

module.exports = function(connect) {
	
	var Store = connect.session.Store,
	    proto = '__proto__';
	
	function FileStore(options) {
		options = options || {};
		Store.call(this, options);
		this.session_dir = options.session_dir || './sessions';
	}
	
	FileStore.prototype[proto] = Store.prototype;
	
	FileStore.prototype.get = function(sid, callback) {
		try {
			//console.log('Fetching sid = ' + sys.inspect(sid));
			fs.readFile(this.session_dir + '/sess-' + sid + '.json', 'UTF-8', function (err, data) {
				//console.log('Fetched  = ' + sys.inspect(doc));
				if((!data) || err) {
					return callback();
				}
				//if(err) return callback(sys.inspect(err));
				callback(null, JSON.parse(data) );
			});
		} catch(e) {
			callback(e);
		}
	};
	
	FileStore.prototype.set = function(sid, session, callback) {
		try {
			/*
			var maxAge = session.cookie.maxAge,
			    oneDay = 86400,
				ttl = ('number' == typeof maxAge) ? (maxAge / 1000 | 0) : oneDay;
			*/
			//console.log('Saving sid = ' + sys.inspect(sid) + ', session = ' + sys.inspect(session));
			fs.writeFile(this.session_dir + '/sess-' + sid + '.json', JSON.stringify(session), function (err, res) {
				if (err) {
					if(callback) {
						callback(sys.inspect(err));
					}
					return;
				}
				if(callback) {
					callback();
				}
			});
		} catch(e) {
			if(callback) {
				callback(e);
			} else {
				console.log('Error: ' + e);
			}
		}
	};
	
	FileStore.prototype.destroy = function(sid, callback) {
		fs.remove(this.session_dir + '/sess-' + sid + '.json', function (err, res) {
			callback(sys.inspect(err));
		});
	};
	
	/*
	FileStore.prototype.length = function(fn){
		this.client.dbsize(fn);
	};

	FileStore.prototype.clear = function(fn){
		this.client.flushdb(fn);
	};
	*/
	
	return FileStore;
};

/* EOF */
