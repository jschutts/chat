// This is the main file of our chat app. It initializes a new 
// express.js instance, requires the config and routes files
// and listens on a port. Start the application by running
// 'node app.js' in your terminal


var express = require('express'),
	app = express();

// This is needed if the app is run on heroku:

var port = process.env.PORT || 3000;

// Initialize a new socket.io object. It is bound to 
// the express app, which allows them to coexist.

var io = require('socket.io').listen(app.listen(port));

// Require the configuration, apiai agent instance and the routes files, and pass
// the app, apiai, and io as arguments to the returned functions.
var request = require('request');
var apiai = require('apiai');
var app2 = apiai("0b25372273e042f29d6333faec6d4065"); //API developer token

require('./config')(app, io);
require('./routes')(app, io, request, app2, apiai);

console.log('Your application is running on port: ' + port);