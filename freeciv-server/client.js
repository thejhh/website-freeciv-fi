

var io = require('socket.io-client'),
    config = require('./config.js'),
    socket_port = config.port || 8000,
    socket = io.connect('http://localhost:' + socket_port),
	connected = false;

socket.on('error', function(msg) {
	console.error('Error: ' + msg);
});

socket.on('connect', function () {
	socket.on('login:failed', function() {
		console.log('Login failed!');
	});
	socket.on('login:done', function() {
		connected = true;
		socket.on('civserver:reply', function (msg) {
			console.log(msg);
		});
	});
	socket.emit('login', config.authkey);
});

var readline = require('readline'),
    rl = readline.createInterface(process.stdin, process.stdout),
    prefix = '$ ';
rl.on('line', function (cmd) {
	if(connected) {
		socket.emit('civserver:exec', cmd);
	} else {
		console.log('Error: Not yet connected!');
	}
	rl.setPrompt(prefix, prefix.length);
	rl.prompt();
}).on('close', function() {
	console.log('Have a great day!');
	process.exit(0);
});

rl.setPrompt(prefix, prefix.length);
rl.prompt();;

/* EOF */
