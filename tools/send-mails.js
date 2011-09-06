
var nodemailer = require('nodemailer'),
	util = require('util');

// one time action to set up SMTP information
nodemailer.SMTP = {
	host: 'atlas.sendanor.fi'
};

var msg_body = require('fs').readFileSync('mail.txt', 'utf-8');

// send an e-mail
function do_sendmail(to_email) {
	util.log("Mailing to '" + to_email + "'");
	nodemailer.send_mail(
	    // e-mail options
	    {
	        sender: 'Jaakko Heusala <jheusala@freeciv.fi>',
	        to:to_email,
	        subject:'Uusi Freeciv-pelimme on alkanut',
	        body:msg_body
	    },
	    // callback function
	    function(error, success){
	        util.log(to_email + ': Message ' + (success ? 'sent' : 'failed') );
	    }
	);
}

var targets = require('fs').readFileSync('targets.txt', 'utf-8').split('\n');

setInterval(function() {
	var target = targets.shift();
	if(!target) process.exit();
	do_sendmail(target);
}, 3000);

/* EOF */
