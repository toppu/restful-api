'use strict';

var nodemailer = require('nodemailer');
var hbs = require('nodemailer-express-handlebars');
var UserModel = require('../../models/userModel.js');

/**
 * @api {put} /api/user/email/:userId Update email
 * @apiVersion 0.1.0
 * @apiDescription Update a user email
 * @apiGroup User
 * @apiPermission user
 *
 * @apiHeader {String} x-key A userId
 * @apiHeader {String} x-access-token A user accessToken
 *
 * @apiParam {String} email A new user's email that is available and valid
 *
 * @apiExample {curl} Example usage:
 * curl -v -X PUT /api/user/settings/email/<userId> \
 * -H "content-type:application/json" \
 * -H "x-key: <userId>" \
 * -H "x-access-token: <accessToken>" \
 * - d '{ "email" : "<email>" }'
 *
 * @apiError UserNotFound User not found
 * @apiErrorExample {json} Error-Response:
 * {
 *    "status": 400,
 *    "message": "Email existed."
 * }
 *
 * @apiSuccess {json} User account updated
 * @apiSuccessExample {json} Success-Response:
 * {
 *    "message": "Email updated."
 * }
 *
 */
exports.updateOne = function (req, res) {

  var token = req.headers['x-access-token'];
  var key = req.headers['x-key'];

  var query = { $and: [{ '_id': key }, { 'token.accessToken': token }] };

  UserModel.findOne(query, function(err, user) {
    if(err) res.status(500).send(err);

    if(!req.body.email || req.body.email==='') { return res.status(400).json({ status:400, message: "Email required." }); }

    if(user.email === req.body.email) { return res.status(400).json({ status:400, message: "Email existed." }); }

    user.email = req.body.email;

    user.save(function (err) {
      if(err) res.status(500).send(err);

      console.log(user.username);
      console.log(user.email);

      var smtpTransport = nodemailer.createTransport();

      smtpTransport.use('compile', hbs({
        viewEngine: '.hbs',
        viewPath: '../server/templates',
        extName: '.hbs'
      }));

      var from = 'immpres <no-reply@immpres.com>';
      var to = req.body.email;
      var subject = 'Your email changed';

      var mail = {
        from: from,
        to: to,
        subject: subject,
        template: 'user_change_email',
        context: {
          subject: subject,
          name: user.username,
          email: user.email
        }
      };

      smtpTransport.sendMail(mail, function (err) {
        if (err) {
          return res.status(500).send(err)
        } else {
          res.json({ message: "Email updated and confirmation email sent." });
        }

      });

    })

  })

};