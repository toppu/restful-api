'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose');

var newsletterSchema = mongoose.Schema({

  email: {
    type: String,
    required: 'Please fill in your email',
    unique: 'Email already existed',
    trim: true,
    lowercase: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address']
  },
  created: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model('Newsletter', newsletterSchema);