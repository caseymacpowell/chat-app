var express = require('express');
var bodyParser = require('body-parser');
var expressSession = require('express-session');
var mongodb = require('mongodb');
var ObjectID = require('mongodb').ObjectId;
var secrets = require("./secrets.js");

var db;

mongodb.MongoClient.connect('mongodb://localhost', function(err, database){
	if(err){
		console.log(err);
		return;
	}
	console.log('Connected to Database. Getting chats...');
	db = database;
	startListening();
});

var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));

app.use(expressSession({
	secret: secrets.secret,
	resave: false,
	saveUninitialized: true
}));

app.post('/api/register', function(req, res){
	// Check to see if username already exists
	db.collection('users').findOne({
		username: req.body.username
	}, function(err, data){
		if(err){
			console.log(err);
			return;
		}
		if(data){
			res.send('error');
			return;
		}
		// If username does not exist, add user to db
		db.collection('users').insertOne({
			username: req.body.username,
			password: req.body.password
		}, function(err, data){
			if(err){
				console.log(err);
				res.status(500);
				res.send('error');
				return;
			}
			res.send('success');
		});
	});
});

// Post to login
app.post('/api/login', function(req, res){
	db.collection('users').findOne({
		username: req.body.username,
		password: req.body.password
	}, function(err, data){
		if(!data){
			res.send('error');
			return;
		}
		req.session.user = {
			_id: data._id,
			username: data.username
		};
		res.send('success');
	});
});

// Chats
app.post('/api/newChats', function(req, res){
	// Check to see if user is logged in
	if(!req.session.user){
		res.statues(403);
		res.send('forbidden');
		return;
	}
	db.collection('chats').insertOne({
		timestamp: Date.now(),
		message: req.body.message,
		submitter: req.session.user._id,
		username: req.session.user.username
	});
	res.send('success');
});

app.get('/api/getChats', function(req, res){
	// Check to see if user is logged in
	if(!req.session.user){
		res.status(403);
		res.send('forbidden');
		return;
	}
	// Find all chats
	db.collection('chats').find({}).toArray(function(err, docs){
		if(err){
			console.log(err);
			return;
		}
		res.send(docs);
	});
});

// Files to be server out of static public folder
app.use(express.static('public'));

// 404 boilerplate
app.use(function(req, res, next) {
	res.status(404);
	res.send("File Not Found! No chats here!");
});

// 500 boilerplate
app.use(function(err, req, res, next) {
	console.log(err);
	res.status(500);
	res.send("Internal Server Error! Chats not available at this time.");
	res.send(err);
});


// Start listening after we've connected to the db
function startListening() {
	app.listen(8080, function() {
		console.log("Sever started at http://localhost:8080 Start chatting!");
	});
}