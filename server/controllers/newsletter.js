'use strict';

/**
 * Module dependencies.
 */
var hbs = require('nodemailer-express-handlebars');
var nodemailer = require('nodemailer');

var NewsletterModel = require('../models/newsletterModel.js');
var config = require('../config/config');

exports.addOne = function (req, res) {

  if (!req.body.email) res.status(406).json({status:406, message:"Email field required." });

  var newsletter = new NewsletterModel(req.body);
  newsletter.email = req.body.email;

  newsletter.save(function(err){
    if (err && err.code === 11000 ) return res.status(402).json({status:402, message:"Email already existed."});

    var smtpTransport = nodemailer.createTransport();

    smtpTransport.use('compile', hbs({
      viewEngine: '.hbs',
      viewPath: 'server/templates',
      extName: '.hbs'
    }));

    var from = 'immpres <no-reply@immpres.com>';
    var to = req.body.email;
    var subject = 'Welcome to the immpres newsletter';

    var mail = {
      from: from,
      to: to,
      subject: subject,
      template: 'news_welcome',
      context: {
        subject: subject,
        name: req.body.firstName !== undefined ? '' + req.body.firstName + req.body.lastName : 'new subscriber',
        email: req.body.email
      }
    };

    if(config.email.subscribe) {
      smtpTransport.sendMail(mail, function (err) {
        if (err) {
          return res.status(500).send(err)
        } else {
          res.json({message: 'Email added and welcome email sent.'});
        }
      });
    } else {
      res.json({message: 'Email added', email: req.body.email});
    }

  });
};