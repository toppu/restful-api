'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose');

var messageSchema = mongoose.Schema({
  sender: mongoose.Schema.Types.Mixed,
  message: mongoose.Schema.Types.Mixed,
  recipients: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model('Message', messageSchema);