/* Freeciv Server Runner */

/*
 * Copyright (C) 2011 by Jaakko-Heikki Heusala <jheusala@iki.fi>
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of 
 * this software and associated documentation files (the "Software"), to deal in 
 * the Software without restriction, including without limitation the rights to 
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies 
 * of the Software, and to permit persons to whom the Software is furnished to do 
 * so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all 
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
 * SOFTWARE.
 */

/* Main Program */
function main() {
	var sys = require('sys'),
	    optimist = require('optimist'),
	    config = require('./config.js'),
		civserver = require('./civserver.js');
	
	var server = civserver.start(config);
	
	server.on('error', function(err) {
		console.log('Error: ' + err);
	});
	
	server.on('reply', function(msg) {
		console.log('reply: ' + msg);
	});
	
	server.on('command executed', function(cmd) {
		console.log('command executed: ' + cmd);
	});
	
	var io = require('socket.io').listen(config.port || 8000);
	io.sockets.on('connection', function (socket) {
		
		socket.once('login', function (authkey) {
			if(!(authkey && (authkey === config.authkey))) {
				console.log('login failed');
				socket.emit('login:failed');
				return;
			}
			
			socket.on('civserver:exec', function (cmd) {
				server.exec(cmd);
			});
			
			socket.on('civserver:end', function () {
				server.end();
			});
			
			server.on('reply', function(msg) {
				socket.emit('civserver:reply', msg);
			});
			
			server.on('command executed', function(msg) {
				socket.emit('civserver:command executed', msg);
			});
			
			socket.emit('login:done');
		});
		
	});
	
	/* Shutdown when Control-C */
	process.on('SIGINT', function () {
		console.log('Got SIGINT. Shutting down.');
		server.end();
	});
}

/* Init System */
var init = require('init'),
    path = require('path'),
    fs = require('fs'),
    home = process.env.HOME || __dirname,
    rcdir = path.resolve(home, ".freeciv-server-js");

if(!path.existsSync(rcdir)) {
	fs.mkdirSync(rcdir, 0700);
}

init.simple({
    pidfile : path.resolve(rcdir, 'server.pid'),
    logfile : path.resolve(rcdir, 'server.log'),
    command : process.argv[3],
    run     : function () {
		main();
    }
})

/* Save server logs every 60 seconds */
/*
setInterval(function() {
	function f(n) { return (""+n).length === 1 ? "0"+n : n; }
	var now = new Date();
	var file = 'backup-' + now.getFullYear() + f(now.getMonth()+1) + f(now.getDate()) + "-" + f(now.getHours()) + f(now.getMinutes()) + f(now.getSeconds());
	server.exec('save ' + file);
}, 60*1000);
*/

/* EOF */
