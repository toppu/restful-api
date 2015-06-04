'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var uniqueValidator = require('mongoose-unique-validator');
var shortid = require('shortid');

shortid.seed(88);

/**
 * A Validation function for local strategy password
 */
var validateLocalStrategyPassword = function(password) {
  return (password && password.length >= 6) ;
};

/**
 * A Validation function for username
 * - at least 3 characters
 * - maximum 32 characters
 * - only a-z0-9_-.
 * - not in list of illegal usernames
 * - no consecutive dots: "." ok, ".." nope
 */
var validateUsername = function(username) {
  //var usernameRegex = /^[a-z0-9.\-_]{3,32}$/;
  var usernameRegex = /^[a-zA-Z0-9.\-_]{3,32}$/;
  var dotsRegex = /^([^.]+\.?)$/;
  var illegalUsernames = ['admin', 're', 're:', 'fwd', 'fwd:', 'reply', 'administrator', 'user', 'password', 'username', 'unknown', 'anonymous', 'home', 'signup', 'signin', 'edit', 'settings', 'password', ' demo', 'test'];
  return (username &&
    usernameRegex.test(username) &&
    illegalUsernames.indexOf(username) < 0 &&
    dotsRegex.test(username) //strpos(username, '..') === false
  );
};

var userSchema = mongoose.Schema({
  _id: {
    type: String,
    default: shortid.generate
  },
  formatVersion: {
    type: String,
    default: "0.1"
  },
  username: {
    type: String,
    required: 'Please fill in your username',
    unique: 'Username already existed',
    trim: true,
    lowercase: true, // Stops users creating case sensitive duplicate usernames with "username" and "USERname"
    //validate: [validateUsername, 'Please fill in valid username: 3-32 characters long non banned word, characters "_-.", no consecutive dots, lowercase letters a-z and numbers 0-9.']
    validate: [validateUsername, 'Please fill in valid username: 3-32 characters long non banned word, characters "_-.", no consecutive dots, lowercase letters a-z, uppercase letters A-Z and numbers 0-9.']
  },
  email: {
    type: String,
    required: 'Please fill in your email',
    unique: 'Email already existed',
    trim: true,
    lowercase: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address']
  },
  password: {
    type: String,
    required: true,
    validate: [validateLocalStrategyPassword, 'Password should be more than 6 characters long.']
  },
  profile: {
    firstName: {
      type: String,
      trim: true,
      default: ''
    },
    lastName: {
      type: String,
      trim: true,
      default: ''
    },
    displayName: {
      type: String,
      trim: true,
      default: ''
    },
    photo: String,
    newsletter: {
      type: Boolean,
      default: true
    }
  },
  history: {
    created: Date,
    updated: {
      type: Date,
      default: Date.now
    },
    visited: Date,
    nbUsernameChanged: Number
  },
  role: {
    type: String,
    default: 'user'
  },
  activated: {
    type: Boolean,
    default: false
  },
  token: {
    activateToken: {
      type: String
    },
    activateTokenExpires: {
      type: Date
    },
    accessToken: {
      type: String
    },
    accessTokenExpires: {
      type: Date
    },
    resetPasswordToken: {
      type: String
    },
    resetPasswordExpires: {
      type: Date
    }
  }
});

/**
 * Execute before each user.save() call Bcrypt middleware
 */
userSchema.pre('save', function(next) {
  var user = this;

  // Break out if the password hasn't changed
  if(!user.isModified('password')) return next();

  // Password changed so we need to hash it
  bcrypt.genSalt(5, function(err, salt) {
    if(err) return next(err);
    bcrypt.hash(user.password, salt, null, function(err, hash) {
      if(err) return next(err);
      user.password = hash;
      next();
    });
  });
});

/**
 * Compare password
 */
userSchema.methods.comparePassword = function(candidatePassword, next) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if(err) return next(err);
    next(null, isMatch);
  });
};

// Define compound indexes at the schema level
// Although, Mongoose recommends disabling 'autoindex' in production
// Once the index has been added, 'ensureIndex' calls will simply see that the index already exists
// and then return. So it only has an effect on performance when we're first creating the index
// and at that time the collections are often empty so creating an index would be quick anyway.
//immUserSchema.index({ email: 1, username: 1 }, { unique: true });

userSchema.plugin(uniqueValidator);
module.exports = mongoose.model('User', userSchema);