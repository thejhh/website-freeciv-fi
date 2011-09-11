/* for node-lint */
/*global Buffer: false, clearInterval: false, clearTimeout: false, console: false, global: false, module: false, process: false, querystring: false, require: false, setInterval: false, setTimeout: false, util: false, __filename: false, __dirname: false */


/* Note: Broken unused file */

/**
 * Module dependencies.
 */

var sys = require('sys'),
    foreach = require('snippets').foreach,
    config = require('./config.js'),
    _db = require('./couchdb.js').sessions;

module.exports = (function(connect) {
	
	var Store = connect.session.Store;
	
	function CouchStore(options) {
		options = options || {};
		Store.call(this, options);
	}
	
	CouchStore.prototype.__proto__ = Store.prototype;
	
	CouchStore.prototype.get = (function(sid, callback) {
		try {
			console.log('Fetching sid = ' + sys.inspect(sid));
			_db.get(sid, function (err, doc) {
				console.log('Fetched doc = ' + sys.inspect(doc));
				var undefined, data = {};
				if( (!doc) || (err && (err.error === 'not_found') && (err.reason==='missing')) ) return callback();
				if(err) return callback(sys.inspect(err));
				foreach(doc).each(function(v, k) { data[k] = v; });
				callback(null, data);
			});
		} catch(e) {
			callback(e);
		}
	});
	
	CouchStore.prototype.set = (function(sid, session, callback) {
		var undefined;
		try {
			console.log('Saving sid = ' + sys.inspect(sid) + ', session = ' + sys.inspect(session));
			_db.save(sid, session, function (err, res) {
				if (err) {
					callback && callback(sys.inspect(err));
					return;
				}
				callback && callback();
			});
		} catch(e) {
			if(callback) callback(e);
			else console.log('Error: ' + e);
		}
	});
	
	CouchStore.prototype.destroy = (function(sid, callback) {
		_db.get(sid, function (err, doc) {
			var undefined;
			if(err) { callback(sys.inspect(err)); return; }
			_db.remove(sid, doc._rev, function (err, res) {
				callback(sys.inspect(err));
			});
		});

	});
	
	/*
	CouchStore.prototype.length = function(fn){
		this.client.dbsize(fn);
	};

	CouchStore.prototype.clear = function(fn){
		this.client.flushdb(fn);
	};
	*/
	
	return CouchStore;
});

/* EOF */
