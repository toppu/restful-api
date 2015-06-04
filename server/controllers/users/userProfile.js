'use strict';

var UserModel = require('../../models/userModel.js');

/**
 * @api {get} /api/user/profile/:userId Get a user profile
 * @apiVersion 0.1.0
 * @apiDescription Get a user's profile details (firstName, lastName, displayName, etc)
 * @apiGroup User
 * @apiPermission user
 *
 * @apiHeader {String} x-key A userId
 * @apiHeader {String} x-access-token A user accessToken
 *
 * @apiExample {curl} Example usage:
 * curl -v -X GET /api/user/settings/profile/<userId> \
 * -H "content-type:application/json" \
 * -H "x-key: <userId>" \
 * -H "x-access-token: <accessToken>"
 *
 * @apiError UserNotFound User not found
 * @apiErrorExample {json} Error-Response:
 * {
 *    "status": 401,
 *    "message": "User not found."
 * }
 *
 * @apiSuccess {json} User's profile details
 * @apiSuccessExample {json} Success-Response:
 *
 {
     "firstName": "Suttipong",
     "lastName": "Mungkala",
     "displayName": "Toppu",
     "newsletter": false
 }
 *
 */
exports.getOne = function(req, res) {

  var token = req.headers['x-access-token'];
  var key = req.headers['x-key'];

  var query = {$and: [{'_id': key}, {'token.accessToken': token}]};

  UserModel.findOne(query, function (err, user) {
    if (err) return res.status(500).send(err);

    if (!user) {
      res.json({
        "status": 401,
        "message": 'User not found.'
      });
    }

    res.json(user.profile);
  });

};

/**
 * @api {put} /api/user/settings/profile/:userId Update a user profile
 * @apiVersion 0.1.0
 * @apiDescription Update a user profile (check userModel.js for more details)
 * @apiGroup User
 * @apiPermission user
 *
 * @apiHeader {String} x-key A userId
 * @apiHeader {String} x-access-token A user accessToken
 *
 * @apiParam {String} [firstname] Firstname
 * @apiParam {String} [lastname] Lastname
 * @apiParam {String} [displayname] Displayname
 * @apiParam {String} [photo] Display image/avatar
 * @apiParam {String} newsletter="false" Newsletter subscription
 *
 * @apiExample {curl} Example usage:
 * curl -v -X PUT /api/user/settings/profile/<userId> \
 * -H "content-type:application/json" \
 * -H "x-key: <userId>" \
 * -H "x-access-token: <accessToken>" \
 * - d \
 * '{ "profile": { "displayName": "Toppu", "lastName": "Mungkala", "firstName": "Suttipong"} }'
 *
 * @apiError UserNotFound User not found
 * @apiErrorExample {json} Error-Response:
 * {
 *    "status": 401,
 *    "message": "User not found."
 * }
 *
 * @apiSuccess {json} User's profile details
 * @apiSuccessExample {json} Success-Response:
 * {
 *    "message": "User profile updated."
 * }
 *
 */
exports.updateOne = function (req, res) {

  var token = req.headers['x-access-token'];
  var key = req.headers['x-key'];

  var query = { $and: [{ '_id': key }, { 'token.accessToken': token }] };

  UserModel.findOne(query, function(err, user) {
    if(err) res.status(500).send(err);

    if(!user) {
      res.status(401).json({
        status: 401,
        message: "User not found."
      })
    }

    console.log(req.body.profile);
    if (req.body.profile)
      user.profile = req.body.profile;
    else
      res.status(400).json({ status: 400, message: "No profile update information provided." });

    user.save(function (err) {
      if(err) res.status(500).send(err);

      res.json({ message: "User profile updated." });
    })

  })

};

  /*
exports.deleteOne = function(req, res) {
  var token = req.headers['x-access-token'];
  var key = req.headers['x-key'];

  var query = { $and: [{ 'userId': key }, { 'token.accessToken': token }] };

  UserModel.remove(query, function(err) {
    if(err) res.status(500).send(err);
    res.json({ message: "A user removed." });
  })

};
*/