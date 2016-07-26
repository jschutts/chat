// This file is executed in the browser, when people visit /chat/<random id>

$(function(){

	// getting the id of the room from the url
	var id = Number(window.location.pathname.match(/\/chat\/(\d+)$/)[1]);

	// connect to the socket
	var socket = io();
	
	// variables which hold the data for each person
	var name = "",
		email = "",
		img = "",
		friend = "";

	// cache some jQuery objects
	var section = $(".section"),
		footer = $("footer"),
		onConnect = $(".connected"),
		inviteSomebody = $(".invite-textfield"),
		personInside = $(".personinside"),
		chatScreen = $(".chatscreen"),
		left = $(".left"),
		noMessages = $(".nomessages"),
		tooManyPeople = $(".toomanypeople");

	// some more jquery objects
	var chatNickname = $(".nickname-chat"),
		leftNickname = $(".nickname-left"),
		loginForm = $(".loginForm"),
		yourName = $("#yourName"),
		yourEmail = $("#yourEmail"),
		hisName = $("#hisName"),
		hisEmail = $("#hisEmail"),
		chatForm = $("#chatform"),
		textarea = $("#message"),
		messageTimeSent = $(".timesent"),
		chats = $(".chats");

	// these variables hold images
	var ownerImage = $("#ownerImage"),
		leftImage = $("#leftImage"),
		noMessagesImage = $("#noMessagesImage");


	// on connection to server get the id of person's room
	socket.on('connect', function(){

		socket.emit('load', id);
	});

	// save the gravatar url
	socket.on('img', function(data){
		img = data;
	});

	// receive the names and avatars of all people in the chat room
	socket.on('peopleinchat', function(data){

		if(data.number === 0){

			showMessage("connected");

			loginForm.on('submit', function(e){

				e.preventDefault();

				name = $.trim(yourName.val());
				
				if(name.length < 1){
					alert("Please enter a nick name longer than 1 character!");
					return;
				}

				email = "asd@hotmail.com";


					showMessage("inviteSomebody");

					// call the server-side function 'login' and send user's parameters
					socket.emit('login', {user: name, avatar: email, id: id});
			
			});
		}

		else if(data.number === 1) {

			showMessage("personinchat",data);

			loginForm.on('submit', function(e){

				e.preventDefault();

				name = $.trim(hisName.val());

				if(name.length < 1){
					alert("Please enter a nick name longer than 1 character!");
					return;
				}

				if(name == data.user){
					alert("There already is a \"" + name + "\" in this room!");
					return;
				}
				email = "as123d@hotmail.com";

					socket.emit('login', {user: name, avatar: email, id: id});
			});
		}

		else {
			showMessage("tooManyPeople");
		}

	});

	// Other useful 

	socket.on('startChat', function(data){
		console.log(data);
		if(data.boolean && data.id == id) {

			chats.empty();

			if(name === data.users[0]) {

				showMessage("youStartedChatWithNoMessages",data);
			}
			else {

				showMessage("heStartedChatWithNoMessages",data);
			}

			chatNickname.text(friend);
		}
	});

	socket.on('leave',function(data){

		if(data.boolean && id==data.room){

			showMessage("somebodyLeft", data);
			chats.empty();
		}

	});

	socket.on('tooMany', function(data){

		if(data.boolean && name.length === 0) {

			showMessage('tooManyPeople');
		}
	});

	socket.on('receive', function(data){

		showMessage('chatStarted');

		if(data.msg.trim().length) {
			
			if (data.msg.lastIndexOf("ADD") == -1)
	        	createChatMessage(data.msg, data.user, data.img, moment());
				scrollToBottom();
	        if (data.user != 'bot'){
	            var request2 = app2.textRequest(data,
	            	{
	            		sessionId: socket.id
	            	});
	            request2.on('response', function(response) {
	                console.log(response);
	                if (response.status.code == '200'){
	                    createChatMessage(response.result.fulfillment.speech, data.user, data.img, moment());
						scrollToBottom();
	                } else {
	                    createChatMessage('Hmm, I don\'t quite have an answer for you, let me check further.', data.user, data.img, moment());
						scrollToBottom();
	                    socket.broadcast.emit('alert');  
	                }
	            });
	            request2.on('error', function(error) {
	            console.log(error);
	            });
	            request2.end()
	        }
	        else if (data.user == 'bot'){
	            if (data.msg.lastIndexOf("ADDE:") != -1){
	                var drug = data.split(": ");
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
						//console.log(body);
						body = JSON.parse(body);
						console.log(drug);

						console.log(body.entries.length);
		            	console.log(body.entries[1].value);
		                for (var i=0; i<body.entries.length; i++){
		                	//console.log("hi");
			                if (body.entries[i].value == drug[1]){
			                	console.log(body.entries[i].synonyms[0]);
			                	console.log('hello match here!');
			                	for (var j=0; j<body.entries[i].synonyms.length; j++){
			                		synonyms.push(body.entries[i].synonyms[j]);
			                	}
			                }
			            }
	////////////////////COPY AND PASTE///////////////////////////////
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
	        }

		}
	});

	textarea.keypress(function(e){

		// Submit the form on enter

		if(e.which == 13) {
			e.preventDefault();
			chatForm.trigger('submit');
		}

	});

	chatForm.on('submit', function(e){

		e.preventDefault();

		// Create a new chat message and display it directly

		showMessage("chatStarted");

		if(textarea.val().trim().length) {
			createChatMessage(textarea.val(), name, img, moment());
			scrollToBottom();

			// Send the message to the other person in the chat
			socket.emit('msg', {msg: textarea.val(), user: name, img: img});

		}
		// Empty the textarea
		textarea.val("");
	});

	// Update the relative time stamps on the chat messages every minute

	setInterval(function(){

		messageTimeSent.each(function(){
			var each = moment($(this).data('time'));
			$(this).text(each.fromNow());
		});

	},60000);

	// Function that creates a new chat message

	function createChatMessage(msg,user,imgg,now){

		var who = '';

		if(user===name) {
			who = 'me';
		}
		else {
			who = 'you';
		}

		var li = $(
			'<li class=' + who + '>'+
				'<div class="image">' +
					'<img src=' + imgg + ' />' +
					'<b></b>' +
					'<i class="timesent" data-time=' + now + '></i> ' +
				'</div>' +
				'<p></p>' +
			'</li>');

		// use the 'text' method to escape malicious user input
		li.find('p').text(msg);
		li.find('b').text(user);

		chats.append(li);

		messageTimeSent = $(".timesent");
		messageTimeSent.last().text(now.fromNow());
	}

	function scrollToBottom(){
		$("html, body").animate({ scrollTop: $(document).height()-$(window).height() },1000);
	}

	function isValid(thatemail) {

		var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return re.test(thatemail);
	}

	function showMessage(status,data){

		if(status === "connected"){

			section.children().css('display', 'none');
			onConnect.fadeIn(1200);
		}

		else if(status === "inviteSomebody"){

			// Set the invite link content
			$("#link").text(window.location.href);

			onConnect.fadeOut(1200, function(){
				inviteSomebody.fadeIn(1200);
			});
		}

		else if(status === "personinchat"){

			onConnect.css("display", "none");
			personInside.fadeIn(1200);

			chatNickname.text(data.user);
			ownerImage.attr("src",data.avatar);
		}

		else if(status === "youStartedChatWithNoMessages") {

			left.fadeOut(1200, function() {
				inviteSomebody.fadeOut(1200,function(){
					noMessages.fadeIn(1200);
					footer.fadeIn(1200);
				});
			});

			friend = data.users[1];
			noMessagesImage.attr("src",data.avatars[1]);
		}

		else if(status === "heStartedChatWithNoMessages") {

			personInside.fadeOut(1200,function(){
				noMessages.fadeIn(1200);
				footer.fadeIn(1200);
			});

			friend = data.users[0];
			noMessagesImage.attr("src",data.avatars[0]);
		}

		else if(status === "chatStarted"){

			section.children().css('display','none');
			chatScreen.css('display','block');
		}

		else if(status === "somebodyLeft"){

			leftImage.attr("src",data.avatar);
			leftNickname.text(data.user);

			section.children().css('display','none');
			footer.css('display', 'none');
			left.fadeIn(1200);
		}

		else if(status === "tooManyPeople") {

			section.children().css('display', 'none');
			tooManyPeople.fadeIn(1200);
		}
	}

});
