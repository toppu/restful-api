'use strict';

/**
 * Module dependencies.
 */
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var path = require('path');

var ObjectMdl = require('../../models/objectModel.js');
var ObjectDIR = path.join( __dirname, '../../../app/assets/objects/');

// Pick here fields to send
var objectFields = "shortId meta data";

/**
 * @api {get} /api/objects get all
 * @apiVersion 0.1.0
 * @apiDescription Return the objects based on a query criteria (role, q, limit).
 * - More criteria will be available in the next version.
 * - Without any query string, by default "/api/immpressions" returns all immpressions.
 * - q: full text search. The return results are sorted by search score, check MongoDB document for more details
 * - s: regular expressions search. The return results are sorted by objectId, check MongoDB document for more details
 *
 * @apiName GetObjects
 * @apiGroup Object
 * @apiPermission user
 *
 * @apiHeader {String} x-key A userId
 * @apiHeader {String} x-access-token A User accessToken
 *
 * @apiParam {String} role Role (browser, viewer, editor, owner)
 * @apiParam {String} q Full text search. Indexes are meta.name, meta.category, meta.tags
 * @apiParam {String} s Regular expressions search. Indexes are meta.name, meta.category, meta.tags
 * @apiParam {String} limit Number of return results
 *
 * @apiExample {curl} Example usage:
 *  curl -v -X GET http://localhost:3000/api/objects?role=browser&q=something&limit=30
 *  -H "content-type:application/json" \
 *  -H "x-key:userId" \
 *  -H "x-access-token:accessToken"
 *
 * @apiError ResourceNotFound Requested immpressions not found.
 * @apiErrorExample {json} Error-Response:
 *  {
 *    "status": 401,
 *    "message": "Requested role does not exist."
 *  }
 *
 *  @apiSuccess {json} objects data of objects.
 *
 */
exports.getAll = function(req, res) {

  var key = req.headers['x-key'];
  var query = '';
  if (req.query.limit) {
    var limit = req.query.limit;
  }

  var results = [];

  function getQuery(role) {
    switch(role) {
      case "browser":
        query = { $or: [{ 'meta.browsers': "*" }, { 'meta.browsers': key }] };
        break;
      case "viewer":
        query = { $or: [{ 'meta.viewers': "*" }, { 'meta.viewers': key }] };
        break;
      case "editor":
        query = { $or: [{ 'meta.editors': "*" }, { 'meta.editors': key }] };
        break;
      case "owner":
        query = { 'meta.owner': key };
        break;
      default:
        res.status(401).json({ status: 401, message: 'Requested role does not exist' });
    }
    return query;
  }

  // role only
  if (req.query.role && !req.query.q && !req.query.s) {

    query = getQuery(req.query.role);
    ObjectMdl
      .find(query)
      .populate({
        path: 'meta.owner',
        select: 'username profile.displayName'
      })
      .select(objectFields)
      .limit(limit)
      .exec(function(err, objects) {
        if(err) { return res.status(500).send(err); }
        res.json(objects);
      });

      // Textsearch only
  } else if (req.query.q && !req.query.role && !req.query.s) {

    var opt_1 = {
      project: '-scene',
      filter: {'meta.browsers': "*"},
      limit: limit
    };

    ObjectMdl.textSearch(req.query.q, opt_1, function (err, objects) {
      if(err) { return res.status(500).send(err); }
       // TODO maybe there is a better way to do this task using MongoDB
      for (var i=0; i<objects.results.length; i++) {
        results[i] = objects.results[i].obj;
        console.log(results[i]);
      }
      res.json(results);
    });

    // RegExp search
  } else if (req.query.s && !req.query.role && !req.query.q) {

    ObjectMdl
      .find()
      .populate({
        path: 'meta.owner',
        select: 'username profile.displayName'
      })
      .select(objectFields)
      .where({
        $or: [
          {'meta.name': {$regex: req.query.s, $options: "i"}},
          {'meta.category': {$regex: req.query.s, $options: "i"}},
          {'meta.tags': {$regex: req.query.s, $options: "i"}},
          {'meta.description': {$regex: req.query.s, $options: "i"}}
        ]
      })
      .limit(limit)
      .exec(function (err, objects) {
        if (err) {
          return res.status(500).send(err);
        }
        res.json(objects);
      });

  // RegExp search and role
  } else if (req.query.s && req.query.role && !req.query.q) {

    query = getQuery(req.query.role);
    ObjectMdl
      .find(query)
      .populate({
        path: 'meta.owner',
        select: 'username profile.displayName'
      })
      .select(objectFields)
      .where({
        $or: [
          {'meta.name': {$regex: req.query.s, $options: "i"}},
          {'meta.category': {$regex: req.query.s, $options: "i"}},
          {'meta.tags': {$regex: req.query.s, $options: "i"}},
          {'meta.description': {$regex: req.query.s, $options: "i"}}
        ]
      })
      .limit(limit)
      .exec(function (err, objects) {
        if (err) {
          return res.status(500).send(err);
        }
        res.json(objects);
      });

    // Textsearch and role
  } else if (req.query.q && req.query.role && !req.query.s) {

      var opt_2 = {
        project: '-scene',
        filter: getQuery(req.query.role),
        limit: limit
      };

      ObjectMdl.textSearch(req.query.q, opt_2, function (err, objects) {
        if(err) { return res.status(500).send(err);  }

        // TODO maybe there is a better way to do this task using MongoDB
        for (var i=0; i<objects.results.length; i++) {
          results[i] = objects.results[i].obj;
          console.log(results[i]);
        }
        res.json(results);
      });

  } else {

      //TODO which criteria to return
      ObjectMdl
        .find()
        .populate({
          path: 'meta.owner',
          select: 'username profile.displayName'
        })
        .select(objectFields)
        .limit(limit)
        .exec(function(err, objects) {
          if(err) { return res.status(500).send(err);  }
          res.json(objects);
        });

  }

};


/**
 * @api {get} /api/objects/:id [owner, editor, viewer] get one
 * @apiVersion 0.1.0
 * @apiDescription Return the object
 *
 * @apiName GetObject
 * @apiGroup Object
 * @apiPermission user
 *
 * @apiHeader {String} x-key A userId
 * @apiHeader {String} x-access-token A User accessToken
 *
 * @apiExample {curl} Example usage:
 *  curl -v -X GET http://localhost:3000/api/objects/<objectId>
 *  -H "content-type:application/json" \
 *  -H "x-key:userId" \
 *  -H "x-access-token:accessToken"
 *
 * @apiError ResourceNotFound Requested object not found.
 * @apiErrorExample {json} Error-Response:
 *  {
 *    "status": 404,
 *    "message": "Requested object not found."
 *  }
 *
 *  @apiSuccess {json} objects objects.
 *
 */
exports.getOne = function (req, res) {

  var key = req.headers['x-key'];

  var criteria = (req.params.id.length < 20)
    ? { 'shortId': req.params.id }
    : { '_id': req.params.id };

  var query = { $and: [
    criteria ,
    { $or:
      [
        { 'meta.viewers': "*" },
        { 'meta.viewers': key },
        { 'meta.editors': "*" },
        { 'meta.editors': key },
        { 'meta.owner': key }
      ]
    }
  ] };

  ObjectMdl.findOne(query , function(err, object) {
    if(err) { return res.status(500).send(err);  }
    if(!object) { res.status(404).json({ status: 404, message: "Requested object not found." }); }

    res.json(object);
  })

};

/**
 * @api {post} /api/objects [owner] Create one
 * @apiVersion 0.1.0
 * @apiDescription Create a new object including a directory named with shortId
 * @apiName CreateObject
 * @apiGroup Object
 * @apiPermission user
 *
 * @apiHeader {String} x-key A userId
 * @apiHeader {String} x-access-token A User accessToken
 *
 * @apiExample {curl} Example usage: Check objects schema for all available fields
 *  curl -v -X POST http://localhost:3000/api/objects
 *  -H "content-type:application/json" \
 *  -H "x-key:userId" \
 *  -H "x-access-token:accessToken" \
 *  -d '{ "meta": { "name": "my_object"}, {"description": "my_description"} }'
 *
 * @apiParam {String} meta.name="unnamed" Name
 * @apiParam {String} [meta.description] Description
 * @apiParam {String} meta.thumbnail="default-thumb.jpg" Thumbnail
 * @apiParam {String} meta.category="none" Category
 * @apiParam {Array} [meta.tags] Tags
 * @apiParam {String} meta.originator="userId" Object's originator
 * @apiParam {String} meta.owner="userId" Object's owner
 * @apiParam {Array} meta.editors='["*"]' A list of editors ["userId_1", "userId_2", ... ]
 * @apiParam {Array} meta.viewers='["*"]' A list of viewers ["userId_1", "userId_2", ... ]
 * @apiParam {Array} meta.browsers='["*"]' A list of browsers ["userId_1", "userId_2", ... ]
 * @apiParam {Number} meta.nbLikes="0" Number of likes
 * @apiParam {Number} meta.nbViews="0" Number of views
 * @apiParam {Mixed} data Data
 *
 * @apiError ObjectNotCreated Object not created.
 * @apiErrorExample {json} Error-Response:
 *  {
 *    "status": 500,
 *    "message": "Failed to save DB."
 *  }
 *
 *  @apiSuccess (201) {json} object A new object created.
 *  @apiSuccessExample {json} Success-Response:
 *  {
 *    "message": "New object created."
 *  }
 *
 */
exports.createOne = function(req, res) {

  var key = req.headers['x-key'];

  var object = new ObjectMdl(req.body);
  object.meta.originator = key;
  object.meta.owner = key;
  object.meta.tsCreated = new Date();

  var path = ObjectDIR+object.shortId;

  object.save(function(err) {
    if(err) { return res.status(500).send(err);  }

    mkdirp(path, function(err) {
      if (err) { return res.status(500).send(err);  }
      else res.json({ message: 'New object created.', shortId: object.shortId ,path: path  });
    });

  })

};

/**
 * @api {put} /api/objects/:id [owner, editor] Update one
 * @apiVersion 0.1.0
 * @apiDescription Update an object that the requesting user is the owner or editor
 * @apiName UpdateObject
 * @apiGroup Object
 * @apiPermission user
 *
 * @apiHeader {String} x-key A username
 * @apiHeader {String} x-access-token A User accessToken
 *
 * @apiExample {curl} Example usage:
 *  curl -v -X PUT http://localhost:3000/api/objects/<id>
 *  -H "content-type:application/json" \
 *  -H "x-key:userId" \
 *  -H "x-access-token:accessToken" \
 *  -d '{ "meta": { "name": "my_object"}, {"description": "my_description"} }'
 *
 * @apiParam {String} meta.name="unnamed" Name
 * @apiParam {String} [meta.description] Description
 * @apiParam {String} meta.thumbnail="default-thumb.jpg" Thumbnail
 * @apiParam {String} meta.category="none" Object category
 * @apiParam {Array} [meta.tags] Tags
 * @apiParam {String} meta.owner="userId" Object's owner
 * @apiParam {Array} meta.editors='["*"]' A list of editors ["userId_1", "userId_2", ... ]
 * @apiParam {Array} meta.viewers='["*"]' A list of viewers ["userId_1", "userId_2", ... ]
 * @apiParam {Array} meta.browsers='["*"]' A list of browsers ["userId_1", "userId_2", ... ]
 * @apiParam {Number} meta.nbLikes="0" Number of likes
 * @apiParam {Number} meta.nbViews="0" Number of views
 * @apiParam {Mixed} data Data
 * 
 * @apiError ResourceNotFound Requested objects were not found.
 * @apiErrorExample {json} Error-Response:
 *  {
 *    "status": 500,
 *    "message": "Object not updated."
 *  }
 *
 * @apiSuccess {json} objects An object in json format.
 * @apiSuccessExample {json} Success-Response:
 *  {
 *    "message": "Object updated."
 *  }
 *
 */
exports.updateOne = function(req, res) {
  var key = req.headers['x-key'];

  var criteria = (req.params.id.length < 20)
    ? { 'shortId': req.params.id }
    : { '_id': req.params.id };

  var query = { $and: [
    criteria ,
    { $or: [{'meta.owner': key}, {'meta.editors.name': key} , {'meta.editors': "*"}] }
  ] };

  //var name = req.body.meta.name || '';

  ObjectMdl.findOne(query, function(err, object) {
    if(err) { return res.status(500).send(err);  }

    if (!object) { res.status(404).json({ status: 404, message: "Requested object not found."}); }

    // Update originator is not allowed
    if (req.body.meta.originator) {
      res.status(401).json( {status: 401, message: "Modifying originator is not allowed"} );
    }
    
    // TODO find a better way to update the followings
    if (req.body.meta.name) object.meta.name = req.body.meta.name;
    if (req.body.meta.description) object.meta.description = req.body.meta.description;
    if (req.body.meta.thumbnail) object.meta.thumbnail = req.body.meta.thumbnail;
    if (req.body.meta.category) object.meta.category = req.body.meta.category;
    if (req.body.meta.tags) object.meta.tags = req.body.meta.tags;
    if (req.body.meta.owner) object.meta.owner = req.body.meta.owner;
    if (req.body.meta.editors) object.meta.editors = req.body.meta.editors;
    if (req.body.meta.viewers) object.meta.viewers = req.body.meta.viewers;
    if (req.body.meta.browsers) object.meta.browsers = req.body.meta.browsers;
    if (req.body.meta.nbLikes) object.meta.nbLikes = req.body.meta.nbLikes;
    if (req.body.meta.nbViews) object.meta.nbViews = req.body.meta.nbViews;
    object.meta.tsModified = new Date();
    
    if (req.body.data) { object.data = req.body.data; }

    object.increment();
    object.save(function (err) {
      if(err) { return res.status(500).send(err);  }

      res.json({ message: "Object updated." });
    })
  })

};

/**
 * @api {delete} /api/objects/:id [owner] Delete one
 * @apiVersion 0.1.0
 * @apiDescription Delete an object owned by the requesting user
 * @apiName DeleteObject
 * @apiGroup Object
 * @apiPermission user
 *
 * @apiHeader {String} x-key A username
 * @apiHeader {String} x-access-token A User accessToken
 *
 * @apiExample {curl} Example usage:
 *  curl -v -X DELETE http://localhost:3000/api/objects/<id>
 *  -H "content-type:application/json" \
 *  -H "x-key:userId" \
 *  -H "x-access-token:accessToken" \
 *
 * @apiError ResourceNotFound Requested objects were not found.
 * @apiErrorExample {json} Error-Response:
 *  {
 *    "status": 500,
 *    "message": "Object not updated."
 *  }
 *
 * @apiSuccess {json} objects An object and relevant folders removed.
 * @apiSuccessExample {json} Success-Response:
 *  {
 *    "message": "Object removed."
 *  }
 *
 */
exports.deleteOne = function(req, res) {
  var key = req.headers['x-key'];

  var criteria = (req.params.id.length < 20)
    ? { 'shortId': req.params.id }
    : { '_id': req.params.id };

  var query = { $and: [
    criteria ,
    { 'meta.owner': key }
  ] };

  ObjectMdl.findOne(query, function(err, object) {
    if(err) { return res.status(500).send(err);  }
    if(!object) { res.json({ status: 404, message: 'Object not found' }); }
  });

  ObjectMdl.findOneAndRemove(query, function(err) {
    if(err) { return res.status(500).send(err);  }

    var path = ObjectDIR+req.params.id;

    rimraf(path, function (err) {
      if (err) { return res.status(500).send(err); }
      else { res.json({ message: 'Object removed.', path: path  }); }
    });

  })

};