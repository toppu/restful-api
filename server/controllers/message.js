'use strict';

/**
 * Module dependencies.
 */

var MessageModel = require('../models/messageModel.js');

exports.addOne = function(req, res) {

  var message = new MessageModel(req.body);
  message.save(function(err) {
    if (err) return res.status(500).send();

    return res.send(message);
  })

};