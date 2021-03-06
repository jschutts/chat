// This file is required by app.js. It sets up event listeners
// for the two main URL endpoints of the application - /create and /chat/:id
// and listens for socket.io messages.

var drugNew = [];
var drugMis = [];
var numQ = 0;
// Export a function, so that we can pass 
// the app, api.ai and io instances from the app.js file:

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
				socket.avatar = data.avatar;
	
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

		//Handles the alerts from the client side nurse chat instance to the bot side of the chat
		socket.on('alert', function(message, data){
	        socket.broadcast.to(socket.room).emit('receive', {msg: message, user: "bot", img: "../img/optum.png"});
	        socket.broadcast.to(socket.room).emit('botEmit', {msg: message, user: "bot", img: "../img/optum.png"});
    	});
		// Handle the sending of messages
		socket.on('msg', function(data){
			//If the message doesn't contain keywords ADD or METRIC, emit it to the chat for the user to see
			if (data.msg.lastIndexOf("ADD") == -1 && data.msg.lastIndexOf("METRIC") == -1)
	        	socket.broadcast.to(socket.room).emit('receive', {msg: data.msg, user: data.user, img: data.img});
	       	//Handles user queries (users who aren't the nurse/bot)
	        if (data.user != 'bot'){
	            var request2 = app2.textRequest(data.msg,
	            	{
	            		//Establish a unique API.AI session
	            		sessionId: socket.id
	            	});
	            request2.on('response', function(response) {
	                numQ++;
	                console.log(response);
	                if (response.status.code == '200'){
	                	socket.broadcast.to(socket.room).emit('receive', {msg: response.result.fulfillment.speech, user: "bot", img: "../img/optum.png"});
	                	socket.broadcast.to(socket.room).emit('botEmit', {msg: response.result.fulfillment.speech, user: "bot", img: "../img/optum.png"});
	                } else { //AKA the bot did not understand the query
	                    socket.broadcast.to(socket.room).emit('receive', {msg: 'Hmm, I don\'t quite have an answer for you, let me check further.', user: "bot", img: "../img/optum.png"});
	                    socket.broadcast.to(socket.room).emit('botEmit', {msg: 'Hmm, I don\'t quite have an answer for you, let me check further.', user: "bot", img: "../img/optum.png"});
	                    //Call client side function which prompts the nurse to enter a message
	                    socket.broadcast.emit('alert' , data);  
	                }
	            });
	            request2.on('error', function(error) {
	            console.log(error);
	            });
	            request2.end()
	        }
	        //Handles the bot training and metrics function of the proof of concept
	        else if (data.user == 'bot'){
	        	//If the nurse wishes to add an entitiy..
	            if (data.msg.lastIndexOf("ADD") != -1){
	                var drug = data.msg.split(": ");
	                console.log(drug);
	                var synonyms =[];
	                request.get({
		                headers: {
		                    'Authorization': 'Bearer b9c554f76c3b471780436428dd458afd',
		                    'Content-Type': 'application/json',
		                    'Accept': 'application/json'
		                },
		                url: 'https://api.api.ai/v1/entities/drug',
		            }, function(error, response, body){
		            	//Upon response from the API.AI API of all the entries present in the drug entity
						body = JSON.parse(body);

						//Grab an drug's existing synonyms
		                for (var i=0; i<body.entries.length; i++){
			                if (body.entries[i].value == drug[1]){
			                	for (var j=0; j<body.entries[i].synonyms.length; j++){
			                		synonyms.push(body.entries[i].synonyms[j]);
			                	}
			                }
			            }
			            
			            synonyms.push(drug[2]);
			            //If we are adding a new entity make this API call to API.AI
			            if (drug[2] == null){
			                drugNew.push(drug[1]);
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
			                	console.log(error);
			                });
		            	}
		            	//If we are adding a new synonym to an existing entity make this API call to API.AI
			            else {
			            	drugMis.push(drug[1]);
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
			                	console.log(error);
			                });
			            }

		            });
	            }
	            //If the nurse wishes to view bot metrics..
	            else if(data.msg.lastIndexOf("METRICS") != -1){
					var numDrugs = drugNew.length + drugMis.length;
					var noDupNew = drugNew.unique();
					var noDupMis = drugMis.unique();
					var printNew;
					var printMis;
					
					if(noDupNew.length == 0){
						printNew = "None";
					}
					else{
						printNew = noDupNew.toString();
					}
					if(noDupMis.length == 0){
						printMis = "None"
					}
					else{
						printMis = noDupMis.toString();

					}
					var mString = "Drugs that were new: " + printNew + " | " + "Drugs That Were Misspelled: " + printMis + " | " +"Number of Drug Additions: " + numDrugs + " | " + "Number of User Queries: " + numQ;
					socket.broadcast.emit('botEmit', {msg: mString, user: "bot", img: "../img/optum.png"});
	            }
	        }

			// When the server receives a message, it sends it to the other person in the room.
		});
	});
};
//Returns an array without duplicates
Array.prototype.unique = function() {
    return this.reduce(function(accum, current) {
        if (accum.indexOf(current) < 0) {
            accum.push(current);
        }
        return accum;
    }, []);
}
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


