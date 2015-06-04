'use strict';

var UserModel = require('../../models/userModel.js');

/**
 * @api {put} /api/user/password/:userId Update password
 * @apiVersion 0.1.0
 * @apiDescription Update a password
 * @apiGroup User
 * @apiPermission user
 *
 * @apiHeader {String} x-key A userId
 * @apiHeader {String} x-access-token A user accessToken
 *
 * @apiParam {String} oldPassword An old password
 * @apiParam {String} newPassword A new password (more than 6 characters long)
 *
 * @apiExample {curl} Example usage:
 * curl -v -X PUT /api/user/settings/admin/<userId> \
 * -H "content-type:application/json" \
 * -H "x-key: <userId>" \
 * -H "x-access-token: <accessToken>" \
 * - d '{ "oldPassword" : "<old_password>", "newPassword" : "<new_password>" }'
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

    if (!req.body.newPassword || !req.body.oldPassword)
      res.status(401).json({ status: 401, message: "oldPassword and newPassword required." });

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