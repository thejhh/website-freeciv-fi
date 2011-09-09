

var io = require('socket.io-client'),
    config = require('./config.js'),
    socket = io.connect('http://localhost:8000');

socket.on('error', function(msg) {
	console.error('Error: ' + msg);
});

socket.on('connect', function () {
	socket.on('login:failed', function() {
		console.log('Login failed!');
	});
	socket.on('login:done', function() {
		socket.emit('civserver:exec', 'help');
		socket.on('civserver:reply', function (msg) {
			console.log(msg);
		});
	});
	socket.emit('login', config.authkey);
});

