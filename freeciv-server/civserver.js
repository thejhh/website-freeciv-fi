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

var sys = require('sys'),
    EventEmitter = require('events').EventEmitter,
    foreach = require('snippets').foreach,
    civserver = module.exports = {};

/* Start Server */
civserver.open = function(file) {
	var command = 'freeciv-server',
	    args = [
			'-l', 'log/civ.log',
			'-R', 'log/rank.log',
			'-s', 'saves',
			'-P', 
			'-r', 'game',
		//	'-a', 'fc_auth.conf',
		//	'-f', file
		],
	    servercli = require('child_process').spawn(command, args),
	    server = new EventEmitter(),
	    buffer = "";
	
	servercli.stdout.on('data', function(data) {
		buffer += data;
		var lines = buffer.split('\n');
		buffer = lines.pop();
		foreach(lines).each(function(line) {
			server.emit('reply', ""+line);
		});
	});
	
	servercli.stderr.on('data', function(data) {
		console.log('stderr: ' + sys.inspect(""+data) );
	});
	
	servercli.on('error', function(error) {
		server.emit('error', command+' error: ' + error );
	});
	
	servercli.on('end', function() {
		console.log(command+' ended.');
		server.emit('end');
	});
	
	/* Execute command */
	server.exec = function(cmd) {
		servercli.stdin.write(cmd+"\n");
		server.emit('command executed', cmd);
	};
	
	/* Execute command */
	server.end = function(cmd) {
		server.exec('quit');
		servercli.stdin.end();
	};
	
	return server;
};

/* EOF */
