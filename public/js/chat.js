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

	// this is a chat prompt
	var msg = [];

	var substate = {
		state0: {
			title: 'Unkown User Query',
			html:'<p>I don\'t undersand the user\'s question, how should I respond?</p>',
			buttons: { Unsure: false, Respond: true },
			focus: 1,
			submit:function(e,v,m,f){
				if(v){
					$.prompt.goToState('state1', true);
					return false;
				}
			}
		},
		state1: {
			html:'Enter a response for the user.<br /><label>Response <input type="text" name="fname" value=""></label>',
			buttons: { Back: -1, Submit: 0 },
			focus: 1,
			submit:function(e,v,m,f){
				e.preventDefault();
				if(v==0){
					$.prompt.goToState('state2');
				}
				else if(v==-1)
					$.prompt.goToState('state0');
			}
		},
		state2: {
			title: "Training",
			html: "If you would like to train enter in a new entity or an existing entity and a synonym/new brand name."+
			'<br /><label>Entity <input type="text" name="lname" value=""></label><br /><label>Synonym <input type="text" name="lname" value=""></label><br />',
			buttons: { "Don\'t Train": -1, Train: 0 },
			focus: 1,
			submit:function(e,v,m,f){
				if(v==0){
					console.log(f);
				}
			}
		}
	};


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

			showMessage("inviteSomebody");
			name = "bot";
			socket.emit('login', {user: name, avatar: "../img/optum.png", id: id});
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

					socket.emit('login', {user: name, avatar: "../img/jervis.png", id: id});
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
			
			createChatMessage(data.msg, data.user, data.img, moment());
			scrollToBottom();

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

	socket.on('botEmit', function(data){
		socket.emit('msg', {msg: data.msg, user: data.user, img: data.img});
	});

	socket.on('alert', function(data){
		$.prompt(substate,{
        	close: function(e,v,m,f){
        		msg = [];
        		$.each(f,function(i,obj){
        			msg.push(obj);
        		});
        		msg[0] = msg[0].replace(/,/g , ";");
        		msg = msg.toString();
	        	msg = msg.split(",");
	        	console.log(msg);
	        	console.log(msg[0]);
        		if (msg[0] == '' && msg[1] == ''){
        			msg = "I still couldn't come up with anything, I reccomend you talk to a doctor.";
        			socket.emit('alert', msg, data);
        		}
        		else if (msg[1] == ''){
        			msg = msg[0];
        			socket.emit('alert', msg, data);
        		}
        		else {
        			socket.emit('alert', msg[0], data);
	        		msg = "ADDE: " + msg[1] + ": " + msg[2];
	        		//socket.emit('msg', {msg: msg, user: "bot", img: "../img/optum.png"});
	        		socket.emit('alert', msg, data);
        		}
        	},
			classes: {
				box: '',
				fade: '',
				prompt: '',
				close: '',
				title: 'lead',
				message: '',
				buttons: '',
				button: 'btn',
				defaultButton: 'btn-primary'
			}
        });  
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
			who = 'you';
		}
		else {
			who = 'me';
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
