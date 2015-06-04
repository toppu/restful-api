/**
 * Module dependencies.
 */
var jwt = require('jwt-simple');

var ImmUserMdl = require('../models/userModel');
var secret = require('../config/secret');

module.exports = function(req, res, next) {

  // When performing a cross domain request, you will receive
  // a preflighted request first. This is to check if our app
  // is safe.

  // We skip the token auth for [OPTIONS] requests.
  //if(req.method == 'OPTIONS') next();

  // allow the client to attach a token in HTTP header
  var token = req.headers['x-access-token'];
  var key = req.headers['x-key'];

  if (token || key) {
    try {
      var decoded = jwt.decode(token, secret());

      if (decoded.exp <= Date.now()) { res.status(400).json({ status: 400, message: 'Token Expired' }); }

      var query = { $and: [{ '_id': key }, { 'token.accessToken': token }] };

      // Authorize the user to see if s/he can access our resources
      ImmUserMdl.findOne(query, function(err, user) {
        if(err) { res.status(500).json({ status: 500, message: 'Failed to query DB' }); }

        if(user) {
          if((req.url.indexOf('admin') >= 0 && user.role == 'admin') || (req.url.indexOf('admin') < 0 && req.url.indexOf('/api/') >= 0)) {
            next(); // To move to next middleware
          } else {
            res.status(403).json({ status: 403, message: 'Not Authorized' });
          }
        } else {
          res.status(401).json({ status: 401, message: "Invalid Token or Key" });
        }
      });

    } catch(err) {
      res.status(500).json({ status: 500, message: "Oops! something went wrong, check Token", error: err });
    }

  } else {
    res.status(401).json({ status: 401, message: 'Invalid Token or Key' });
  }
};
