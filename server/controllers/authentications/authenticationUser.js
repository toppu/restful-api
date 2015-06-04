'use strict';

/**
 * Module dependencies.
 */
var jwt = require('jwt-simple');
var nodemailer = require('nodemailer');
var crypto = require('crypto');
var mkdirp = require('mkdirp');
var path = require('path');
var hbs = require('nodemailer-express-handlebars');

var secret = require('../../config/secret.js');
var UserModel = require('../../models/userModel.js');
var UserDIR = path.join( __dirname, '../../../app/users/');

var hostURL = "https://immpres.com:9081";

/**
 * @api {post} /auth/signup Signup a new user
 * @apiVersion 0.1.0
 * @apiDescription Create a new user and send email confirmation.
 * @apiName SignupUser
 * @apiGroup Authentication
 * @apiPermission all
 *
 *  * @apiParam {String} username Username that matches the followings:
 * - at least 3 characters
 * - maximum 32 characters
 * - only a-z0-9_-.
 * - not in list of illegal usernames (check userModel.js)
 * - no consecutive dots: "." ok, ".." nope
 * @apiParam {String} email Email
 * @apiParam {String} password Password should more than 6 characters long
 * @apiParam {String} [firstname]
 * @apiParam {String} [lastname]
 *
 * @apiExample {curl} Example usage:
 * curl -v -X POST http://localhost:3000/auth/signup \
 * -H "content-type:application/json" \
 * -d '{ "username" : "myusername", "password" : "mypassword", "email": "admin@immpres.com" }'
 *
 * @apiError ValidatonError Validation failed
 * @apiErrorExample {json} Error-Response:
 * {
 *   "message": "Validation failed",
 *   "name": "ValidationError",
 *   "errors": {
 *       "email": {
 *           "message": "Email already existed",
 *           "name": "ValidatorError",
 *           "path": "email",
 *           "type": "user defined",
 *           "value": "myemail@immpres.com"
 *                }
 *            }
 * }
 *
 * @apiSuccess {json} New account created and email confirmation sent.
 * @apiSuccessExample {json} Success-Response:
 *  {
 *    "status": 201,
 *    "message": "New user added and confirmation email sent."
 *  }
 *
 */
exports.signup = function(req, res, next) {

  UserModel.find({ $or: [{'username': req.body.username} , {'email': req.body.email}] }, function(err, user) {
    if (err) return next(err);

    //if (user.length !== 0) {
    //  res.json({
    //    status: 401,
    //    message: 'Username or Email already existed.'
    //  });

    //} else {

    // Create token for email confirmation
    var token = crypto.randomBytes(48).toString('hex');
    var link = hostURL + "/auth/signup_verify/"+token;

    var newUser = new UserModel(req.body);
    newUser.username = req.body.username;
    newUser.email = req.body.email;
    newUser.password = req.body.password;
    newUser.profile.firstName = req.body.firstname;
    newUser.profile.lastName = req.body.lastname;
    newUser.history.created = new Date();
    newUser.token.activateToken = token;

    newUser.save(function (err) {
      if (err) return res.status(500).send(err);

      var smtpTransport = nodemailer.createTransport();

      smtpTransport.use('compile', hbs({
        viewEngine: '.hbs',
        viewPath: 'server/templates',
        extName: '.hbs'
      }));

      var from = 'immpres <no-reply@immpres.com>';
      var to = req.body.email;
      var subject = 'Confirm your registration';

      var mail = {
        from: from,
        to: to,
        subject: subject,
        template: 'signup_welcome',
        context: {
          subject: subject,
          name: req.body.username,
          email: req.body.email,
          link: link
        }
      };

      smtpTransport.sendMail(mail, function (err) {
        if (err) {
          return res.status(500).send(err)
        } else {
          res.json({ message: 'New user added and confirmation email sent.' });
        }

      });

    });

  });

};

/**
 * Custom ValidationError message returned from mongoose
 */
/*
 function errorHelper(err, cb) {
 //If it isn't a mongoose-validation error, just throw it.
 if (err.name !== 'ValidationError') return cb(err);

 var messages = {
 'required': "%s required.",
 'user defined': "%s already existed."
 };

 //A validationerror can contain more than one error.
 var errors = [];

 //Loop over the errors object of the Validation Error
 Object.keys(err.errors).forEach(function (field) {
 var eObj = err.errors[field];

 //If we don't have a message for `type`, just push the error through
 if (!messages.hasOwnProperty(eObj.type)) errors.push(eObj.type);

 //Otherwise, use util.format to format the message, and passing the path
 else errors.push(require('util').format(messages[eObj.type], eObj.path));
 });

 return cb(errors);
 }
 */

// Verify user signup
exports.signupVerify = function(req, res) {

  UserModel.findOne({ 'token.activateToken': req.params.token }, function(err, user) {
    if(err) { return res.status(500).send(err) }

    //if(!user) { res.status(401).json({status: 401, message: 'Activate token is invalid.'}); }
    if(!user) { res.redirect('/signup_fail'); }

    var path = UserDIR+user._id+"/uploads";

    if(!user.activated) {
      user.activated = true;
      user.save(function(err) {
        if (err) { return res.status(500).send(err); }
        mkdirp(path, function(err) {
          if (err) { return res.status(500).send(err); }
          //res.json({ message: 'New user activated.', userId: user._id, path: path  });
          res.redirect('/signup_success');
        });
      });
    } else {
      //res.status(400).json({ status: 400, message: 'User already activated.' });
      res.redirect('back');
    }

  });

};


/*
// Allow to login with username or email
passport.use(new LocalStrategy(
  function(username, password, callback) {

    var criteria = (username.indexOf('@') === -1)
      ? { 'username': username }
      : { 'email': username };

    UserModel.findOne(criteria, function (err, user) {
      if (err) { return callback(err); }

      // No user found
     if (!user) { return callback(null, false); }

      // User not activated
      if (!user.activated) { return callback(null, false, { status: 401, message: 'User not activated.' }); }

      // Make sure the password is correct
      user.comparePassword(password, function(err, isMatch) {
        if (err) return res.json({"message": "NOT Json"});

        // Password did not match
        if (!isMatch) { return callback(null, false, { status: 401, message: 'Incorrect password.' }); }

        // Success
        return callback(null, user);
      });
    });

  }
));
*/

// Use passport local strategy and disable session
/**
 * @api {post} /auth/login Login
 * @apiVersion 0.1.0
 * @apiDescription Login with username or email
 * @apiName LoginUser
 * @apiGroup Authentication
 * @apiPermission user
 *
 * @apiParam {String} username Username or email
 * @apiParam {String} password Password
 *
 * @apiExample {curl} Example usage:
 * curl -v -X POST http://localhost:3000/auth/login \
 * -H "content-type:application/json" \
 * -d '{"username" : "myusername_or_myemail", "password" : "mypassword" }'
 *
 * @apiError ValidatonError Validation failed
 * @apiErrorExample {json} Error-Response:
 * {
 *    "status": 401,
 *    "message": "Incorrect username."
 * }
 *
 * @apiSuccess {json} Return access token, accessTokenExpires(7days) and key(userId).
 * @apiSuccessExample {json} Success-Response:
 * {
 *    "message": "logged in",
 *    "accessToken": "<accessToken>",
 *    "accessTokenExpires": 1425980243144,
 *    "key": "nvmbBdLw"
 * }
 *
 */

/*
exports.login = function (req, res, next) {
  passport.authenticate('local', { session: false }, function (err, user, info) {
    if(err) { return next(err); }

    if(!user) { return res.status(401).json({status: 401, message: 'Incorrect username or password.'}); }

    // Generate a token and dispatch it to the user
    // TODO don't update token if it's not expired or existed in MongoDB
    var token = genToken(user.userId);
    UserModel.update({ 'userId': user.userId }, {'token.accessToken': token.accessToken}, function(err){
      if(err) { return res.send(err) }

      res.json(token);
    });
    //return res.send();
  })(req, res, next);
};
*/

exports.login = function (req, res, next) {

  var username = req.body.username;
  var password = req.body.password;

  console.log(username);
  console.log(password);

  if (username ==='' || password === '' || username === undefined || password === undefined) {
    return res.status(401).json({status: 401, message: 'Username and password required.'})
  }

  // Allow to login with username or email
  var criteria = (username.indexOf('@') === -1)
    ? { 'username': username }
    : { 'email': username };

  UserModel.findOne(criteria, function(err, user) {

    if (err) { return next(err); }

    console.log(user._id);

    // No user found
    if (user === null) { return res.status(401).json({status: 401, message: 'Incorrect username.'}) }

    // User not activated
    if (!user.activated) { return res.status(401).json({ status: 401, message: 'User not activated.' }); }

    // Make sure the password is correct
    user.comparePassword(password, function(err, isMatch) {
      if (err) { return next(err); }

      // Password did not match
      if (!isMatch) { return res.status(401).json({ status: 401, message: 'Incorrect password.' }); }

      // Success
      // Generate a token and dispatch it to the user
      // TODO don't update token if it's not expired or existed in MongoDB
      if (!user.displayName) var displayName = user.username;
      else  displayName = user.displayName;

      var token = genToken(user._id, displayName);
      UserModel.update({ '_id': user._id }, {'token.accessToken': token.accessToken}, function(err){
        if(err) { return next(err); }

        res.json(token);
      });
    });

  });

};

// Logout
/**
 * @api {get} /auth/logout Logout
 * @apiVersion 0.1.0
 * @apiDescription Logout
 * @apiName LogoutUser
 * @apiGroup Authentication
 * @apiPermission user
 *
 * @apiHeader {String} x-key A userId
 * @apiHeader {String} x-access-token A User accessToken
 *
 * @apiExample {curl} Example usage:
 * curl -v -X GET http://localhost:3000/auth/logout \
 * -H "content-type:application/json" \
 * -H "x-key: <userId>" \
 * -H "x-access-token: <accessToken>"
 *
 * @apiError LogoutError Logout error: Invalid Token or Key
 * @apiErrorExample {json} Error-Response:
 * {
 *    "status": 401,
 *    "message": "Logout error: Invalid Token or Key"
 * }
 *
 * @apiSuccess {json} Logout message
 * @apiSuccessExample {json} Success-Response:
 *
 * {
 *   "message": "User logged out."
 * }
 */
exports.logout = function(req, res, next) {

  var token = req.headers['x-access-token'];
  var key = req.headers['x-key'];

  UserModel.findOne({ '_id': key, 'token.accessToken': token}, function(err, user) {
    if (err) { return next(err); }

    if(!user) {
      res.status(401).json({
        'status': 401,
        'message': "Logout error: Invalid Token or Key"
      });
      return res.send();
    }

    user.token.accessToken = "";
    user.history.visited = new Date();
    user.save(function(err){
      if (err) { return res.status(500).send(err); }
      res.json({ 'message': "User logged out." });
    })

  })

};

/**
 * @api {get} /auth/authenticated Check authentication
 * @apiVersion 0.1.0
 * @apiDescription Check authentication
 * @apiName CheckAuthentication
 * @apiGroup Authentication
 * @apiPermission user
 *
 * @apiHeader {String} x-key A userId
 * @apiHeader {String} x-access-token A User accessToken
 *
 * @apiExample {curl} Example usage:
 * curl -v -X GET http://localhost:3000/auth/authenticated \
 * -H "content-type:application/json" \
 * -H "x-key: <userId>" \
 * -H "x-access-token: <accessToken>"
 *
 * @apiError LogoutError Logout error: Invalid Token or Key
 * @apiErrorExample {json} Error-Response:
 * {
 *    "status": 401,
 *    "message": "Invalid Token or Key"
 * }
 *
 * @apiSuccessExample {json} Success-Response:
 *
 * {
 *   "message": "Authenticated."
 * }
 */
exports.authenticated = function(req, res) {

  var token = req.headers['x-access-token'];
  var key = req.headers['x-key'];

  if (!key || !token) {
    res.status(401).json({ status: 401, message: "Token and Key required." });
  }

  try {

    var query = { $and: [{ '_id': key }, { 'token.accessToken': token }] };
    UserModel.findOne(query, function(err, user) {
      if(err) { return res.status(500).send(err); }

      if(user) {
        res.json({ message: "Authenticated." });
      } else {
        res.status(401).json({ status: 401, message: "Invalid Token or Key" });
      }
    });

  } catch(err) {
    res.status(500).json({ status: 500, message: "Oops! something went wrong, check Token", error: err });
  }

};

function genToken(userId, displayName) {
  var expires = expiresIn(7); // 7 days
  //var expires = Date.now();
  var token = jwt.encode({
    iss: userId,
    exp: expires
  },  secret());

  return {
    message: "logged in",
    accessToken: token,
    accessTokenExpires: expires,
    key: userId,
    displayName: displayName
  };
}

function expiresIn(numDays) {
  var dateObj = new Date();
  return dateObj.setDate(dateObj.getDate() + numDays);
}