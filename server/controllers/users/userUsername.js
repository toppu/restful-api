'use strict';

var UserModel = require('../../models/userModel.js');

/**
 * @api {put} /api/user/username/:userId Update username
 * @apiVersion 0.1.0
 * @apiDescription Update a username
 * @apiGroup User
 * @apiPermission user
 *
 * @apiHeader {String} x-key A userId
 * @apiHeader {String} x-access-token A user accessToken
 *
 * @apiParam {String} oldPassword A new username that is available and matches the followings:
 * - at least 3 characters
 * - maximum 32 characters
 * - only a-zA-Z0-9 and "_-."
 * - not in list of illegal usernames (check userModel.js)
 * - no consecutive dots: "." ok, ".." nope
 *
 * @apiExample {curl} Example usage:
 * curl -v -X PUT /api/user/settings/admin/<userId> \
 * -H "content-type:application/json" \
 * -H "x-key: <userId>" \
 * -H "x-access-token: <accessToken>" \
 * - d '{ "username" : "<username>"}'
 *
 * @apiError UserNotFound User not found
 * @apiErrorExample {json} Error-Response:
 * {
 *    "status": 401,
 *    "message": "oldPassword did not match."
 * }
 *
 * @apiSuccess {json} User account updated
 * @apiSuccessExample {json} Success-Response:
 * {
 *    "message": "Password updated."
 * }
 *
 */
exports.updateOne = function (req, res) {

  var token = req.headers['x-access-token'];
  var key = req.headers['x-key'];

  var query = { $and: [{ '_id': key }, { 'token.accessToken': token }] };

  UserModel.findOne(query, function(err, user) {
    if(err) res.status(500).send(err);

    if(!user) { res.json({ status: 401, message: "User not found."}); }

    if (!req.body.username)
      res.status(401).json({ status: 401, message: "Username required." });

    // Compare the old password
    user.comparePassword(req.body.oldPassword, function(err, isMatch) {
      if (err) res.status(500).send(err);

      if (!isMatch) { return res.status(401).json({ status: 401, message: 'oldPassword did not match.' }); }

      user.password = req.body.newPassword;

      user.save(function (err) {
        if(err) res.status(500).send(err);

        res.json({ message: "Password updated." });
      })
    });

  })

};