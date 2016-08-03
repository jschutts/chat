// This file is required by app.js. It sets up event listeners
// for the two main URL endpoints of the application - /create and /chat/:id
// and listens for socket.io messages.

// Use the gravatar module, to turn email addresses into avatar images:


var gravatar = require('gravatar');

// Export a function, so that we can pass 
// the app and io instances from the app.js file:

module.exports = function(app,io, request, app2, apiai){

	app.get('/', function(req, res){

		// Render views/home.html
		res.render('home');
	});

	app.get('/create', function(req,res){

		// Generate unique id for the room
		var id = Math.round((Math.random() * 1000000));

		// Redirect to the random room
		res.redirect('/chat/'+id);
	});

	app.get('/chat/:id', function(req,res){

		// Render the chant.html view
		res.render('chat');
	});

	// Initialize a new socket.io application, named 'chat'
	var chat = io.on('connection', function (socket) {

		// When the client emits the 'load' event, reply with the 
		// number of people in this chat room

		socket.on('load',function(data){

			var room = findClientsSocket(io,data);
			if(room.length === 0 ) {

				socket.emit('peopleinchat', {number: 0});
			}
			else if(room.length === 1) {

				socket.emit('peopleinchat', {
					number: 1,
					user: room[0].username,
					avatar: room[0].avatar,
					id: data
				});
			}
			else if(room.length >= 2) {

				chat.emit('tooMany', {boolean: true});
			}
		});

		// When the client emits 'login', save his name and avatar,
		// and add them to the room
		socket.on('login', function(data) {

			var room = findClientsSocket(io, data.id);
			// Only two people per room are allowed
			if (room.length < 2) {

				// Use the socket object to store data. Each client gets
				// their own unique socket object

				socket.username = data.user;
				socket.room = data.id;
				// Tell the person what he should use for an avatar
				//if(data.user == "bot"){
					socket.avatar = data.avatar;
				//}
				/*else{
					socket.avatar = "";
				}*/
				socket.emit('img', socket.avatar);


				// Add the client to the room
				socket.join(data.id);

				if (room.length == 1) {

					var usernames = [],
						avatars = [];

					usernames.push(room[0].username);
					usernames.push(socket.username);

					avatars.push(room[0].avatar);
					avatars.push(socket.avatar);

					// Send the startChat event to all the people in the
					// room, along with a list of people that are in it.

					chat.in(data.id).emit('startChat', {
						boolean: true,
						id: data.id,
						users: usernames,
						avatars: avatars
					});
				}
			}
			else {
				socket.emit('tooMany', {boolean: true});
			}
		});

		// Somebody left the chat
		socket.on('disconnect', function() {

			// Notify the other person in the chat room
			// that his partner has left

			socket.broadcast.to(this.room).emit('leave', {
				boolean: true,
				room: this.room,
				user: this.username,
				avatar: this.avatar
			});

			// leave the room
			socket.leave(socket.room);
		});

		socket.on('alert', function(message, data){
	        console.log('alerted');
	        socket.broadcast.to(socket.room).emit('receive', {msg: message, user: "bot", img: "../img/optum.png"});
	        socket.broadcast.to(socket.room).emit('botEmit', {msg: message, user: "bot", img: "../img/optum.png"});
    	});
		// Handle the sending of messages
		socket.on('msg', function(data){

			if (data.msg.lastIndexOf("ADD") == -1 && data.msg.lastIndexOf("METRIC") == -1)
	        	socket.broadcast.to(socket.room).emit('receive', {msg: data.msg, user: data.user, img: data.img});
	        if (data.user != 'bot'){
	        	console.log(data.user);
	            var request2 = app2.textRequest(data.msg,
	            	{
	            		sessionId: socket.id
	            	});
	            request2.on('response', function(response) {
	                console.log(response);
	                if (response.status.code == '200'){
	                	socket.broadcast.to(socket.room).emit('receive', {msg: response.result.fulfillment.speech, user: "bot", img: "../img/optum.png"});
	                	socket.broadcast.to(socket.room).emit('botEmit', {msg: response.result.fulfillment.speech, user: "bot", img: "../img/optum.png"});
	                } else {
	                    socket.broadcast.to(socket.room).emit('receive', {msg: 'Hmm, I don\'t quite have an answer for you, let me check further.', user: "bot", img: "../img/optum.png"});
	                    socket.broadcast.to(socket.room).emit('botEmit', {msg: 'Hmm, I don\'t quite have an answer for you, let me check further.', user: "bot", img: "../img/optum.png"});
	                    socket.broadcast.emit('alert' , data);  
	                }
	            });
	            request2.on('error', function(error) {
	            console.log(error);
	            });
	            request2.end()
	        }
	        else if (data.user == 'bot'){
	        	var drugMetrics = [];

	            if (data.msg.lastIndexOf("ADDE:") != -1){
	                var drug = data.msg.split(": ");
	                drugMetrics.push(drug[1]);
	                console.log(drugMetrics);
	                var synonyms =[];
	                request.get({
		                headers: {
		                    'Authorization': 'Bearer b9c554f76c3b471780436428dd458afd',
		                    'Content-Type': 'application/json',
		                    'Accept': 'application/json'
		                },
		                url: 'https://api.api.ai/v1/entities/drug',
		            }, function(error, response, body){
						body = JSON.parse(body);
						console.log(drug);

						console.log(body.entries.length);
		            	console.log(body.entries[1].value);
		                for (var i=0; i<body.entries.length; i++){
			                if (body.entries[i].value == drug[1]){
			                	console.log(body.entries[i].synonyms[0]);
			                	console.log('hello match here!');
			                	for (var j=0; j<body.entries[i].synonyms.length; j++){
			                		synonyms.push(body.entries[i].synonyms[j]);
			                	}
			                }
			            }
			            if (drug[2] == null){
			                request.put({
			                	headers: {
			                        'Authorization': 'Bearer b9c554f76c3b471780436428dd458afd',
			                        'Content-Type': 'application/json',
			                        'Accept': 'application/json'
			                    },
			                    url: 'https://api.api.ai/v1/entities/drug/entries',
			                    body: {
			                    	"value": drug[1],
			                    	"synonyms": [
			                    		drug[1]
			                    	]
			                    },
			                    json: true
			                }, function(error, response, body){
			                	console.log(body);
			                });
		            	}
			            else {
			            	synonyms.push(drug[2]);
							request.put({
			                	headers: {
			                        'Authorization': 'Bearer b9c554f76c3b471780436428dd458afd',
			                        'Content-Type': 'application/json',
			                        'Accept': 'application/json'
			                    },
			                    url: 'https://api.api.ai/v1/entities/drug/entries',
			                    body: {
			                    	"value": drug[1],
			                    	"synonyms": synonyms
			                    },
			                    json: true
			                }, function(error, response, body){
			                	console.log(body);
			                });
			            }

		            });
	            }
	            else if(data.msg.lastIndexOf("METRICS") != -1){
					var print = drugMetrics.toString();
					console.log(print);
					socket.broadcast.emit('botEmit', {msg: print, user: "bot", img: "../img/optum.png"});
	            }
	        }

			// When the server receives a message, it sends it to the other person in the room.
		});
	});
};

function findClientsSocket(io,roomId, namespace) {
	var res = [],
		ns = io.of(namespace ||"/");    // the default namespace is "/"

	if (ns) {
		for (var id in ns.connected) {
			if(roomId) {
				var index = ns.connected[id].rooms.indexOf(roomId) ;
				if(index !== -1) {
					res.push(ns.connected[id]);
				}
			}
			else {
				res.push(ns.connected[id]);
			}
		}
	}
	return res;
}


