'use strict';

/**
 * Module dependencies.
 */
var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var path = require('path');
var logger = require('morgan');
var config = require('./config/config')

// Connect to the imms MongoDB
mongoose.connect('mongodb://'+config.mongo.user+':'+config.mongo.password+'@'+config.mongo.host+':'+config.mongo.port+'/'+config.mongo.db);

var app = express();

app.set('port', process.env.PORT || 3000);
app.set('view engine', 'handlebars');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files
app.use(express.static( path.join( __dirname, '../app') ));
app.use(express.static( path.join( __dirname, '../.tmp') ));

// Enable Cross Origin Resource Sharing (CORS)
app.all('/*', function(req, res, next) {
  // CORS headers
  res.header("Access-Control-Allow-Origin", "*"); // restrict it to the required domain
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  // Set custom headers for CORS
  res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
  if (req.method == 'OPTIONS') {
    res.status(200).end();
  } else {
    next();
  }
});

// Auth Middleware - checks if the token is valid
// Only the requests that start with /api/* will be checked for the token
app.all('/api/*', [require('./middlewares/validateRequest.js')]);

// Console log
app.use(logger('dev'));

// List of routes (controllers)
app.use('/', require('./routes'));

// Custom 404 page
app.use(function(req, res) {
  res.sendfile( path.join( __dirname, '../app/errors/error_404.html' ) );
  //res.status(404).json({ status: 404, message: 'Not Found' });
});

// Custom 500 page
app.use(function(err, req, res) {
  console.error(err.stack);
  res.sendfile( path.join( __dirname, '../app/errors/error_500.html' ) );
  //res.status(500).json({ status: 500, message: 'Server Error' });
});

app.listen(app.get('port'), function(){
  console.log('Express backend started on http://localhost:' + app.get('port'));
});
