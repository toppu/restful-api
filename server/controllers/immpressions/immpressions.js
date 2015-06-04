'use strict';

var ImmpressionMdl = require('../../models/immpressionModel.js');

// Pick here fields to send
var immFields = "meta shortId";

// Public immpressios
/*
exports.getAllPublic = function(req, res) {

  ImmpressionMdl.find(query, function(err, imms) {
  //ImmpressionMdl.find(query , exports.immpressionFields, function(err, imms) {
    if(err) { res.json({ status: 500, message: 'Failed to query DB' }); }
    if(imms.length === 0) { res.json({ status: 404, message: 'Requested immpressions not found.' }); }

    // send only metadata, NOT scene data
    for (var i=0; i<imms.length; i++) {
      imms[i].scene = {};
    }

    res.json(imms);
  })

};
*/

/**
 * @api {get} /api/immpressions get all
 * @apiVersion 0.1.0
 * @apiDescription Return the immpressions (meta data) based on a query criteria (role, q, s, limit).
 * - More criteria will be available in the next version.
 * - Without any query string, by default "/api/immpressions" returns all immpressions.
 * - q: full text search. The return results are sorted by search score, check MongoDB document for more details
 * - s: regular expressions search. The return results are sorted by objectId, check MongoDB document for more details
 *
 * @apiName GetImmpressions
 * @apiGroup Immpression
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
 *  curl -v -X GET http://localhost:3000/api/immpressions?role=browser&q=something&limit=30
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
 *  @apiSuccess {json} immpressions Meta data of immpressions.
 *
 */
exports.getAll = function(req, res) {

  var key = req.headers['x-key'];
  var query = '';
  if (req.query.limit) {
    var limit = req.query.limit;
  }
  var results=[];

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
    ImmpressionMdl
      .find(query)
      .populate({
        path: 'meta.owner',
        select: 'username profile.displayName'
      })
      .select(immFields)
      .limit(limit)
      .exec(function(err, imms) {
        if (err) return res.status(500).send(err);

        res.json(imms);
      });

  // Full text search
  } else if (req.query.q && !req.query.role && !req.query.s) {

    var opt_1 = {
      project: '-scene -path -states',
      filter: {'meta.browsers': "*"},
      limit: limit
    };

    ImmpressionMdl.textSearch(req.query.q, opt_1, function (err, imms) {
      if (err) {
        return res.status(500).send(err);
      }

      // TODO maybe there is a better way to do this task using MongoDB
      for (var i = 0; i < imms.results.length; i++) {
        results[i] = imms.results[i].obj;
      }
      res.json(results);
    });

  // RegExp search
  } else if (req.query.s && !req.query.role && !req.query.q) {

    ImmpressionMdl
      .find()
      .populate({
        path: 'meta.owner',
        select: 'username profile.displayName'
      })
      .select(immFields)
      //.where({ 'meta.name': new RegExp('^' + '[' + req.query.s + ']', 'i') })
      .where({
        $or: [
          {'meta.name': {$regex: req.query.s, $options: "i"}},
          {'meta.category': {$regex: req.query.s, $options: "i"}},
          {'meta.tags': {$regex: req.query.s, $options: "i"}},
          {'meta.description': {$regex: req.query.s, $options: "i"}}
        ]
      })
      .limit(limit)
      .exec(function (err, imms) {
        if (err) {
          return res.status(500).send(err);
        }
        res.json(imms);
      });

  // RegExp search and role
  } else if (req.query.s && req.query.role && !req.query.q) {

    query = getQuery(req.query.role);
    ImmpressionMdl
      .find(query)
      .populate({
        path: 'meta.owner',
        select: 'username profile.displayName'
      })
      .select(immFields)
      //.where({ 'meta.name': new RegExp('^' + '[' + req.query.s + ']', 'i') })
      .where({
        $or: [
          {'meta.name': {$regex: req.query.s, $options: "i"}},
          {'meta.category': {$regex: req.query.s, $options: "i"}},
          {'meta.tags': {$regex: req.query.s, $options: "i"}},
          {'meta.description': {$regex: req.query.s, $options: "i"}}
        ]
      })
      .limit(limit)
      .exec(function (err, imms) {
        if (err) {
          return res.status(500).send(err);
        }
        res.json(imms);
      });

  // Full text search and role
  } else if (req.query.q && req.query.role && !req.query.s) {

    var opt_2 = {
      project: '-scene -path -states',
      filter: getQuery(req.query.role),
      limit: limit
    };

    ImmpressionMdl.textSearch(req.query.q, opt_2, function (err, imms) {
      if(err) { return res.status(500).send(err); }

      // TODO maybe there is a better way to do this task using MongoDB
      for (var i=0; i<imms.results.length; i++) {
        results[i] = imms.results[i].obj;
      }
      res.json(results);
    });

  } else {

    //TODO which criteria to return
    ImmpressionMdl
      .find()
      .populate({
        path: 'meta.owner',
        select: 'username profile.displayName'
      })
      .select(immFields)
      .limit(limit)
      .exec(function(err, imms) {
        if(err) { return res.status(500).send(err); }

        res.json(imms);
    });

  }

};

/**
 * @api {get} /api/immpressions/:id [owner, editor, viewer] get one
 * @apiVersion 0.1.0
 * @apiDescription Return the immpression (meta data, scene and path)
 *
 * @apiName GetImmpression
 * @apiGroup Immpression
 * @apiPermission user
 *
 * @apiHeader {String} x-key A userId
 * @apiHeader {String} x-access-token A User accessToken
 *
 * @apiExample {curl} Example usage:
 *  curl -v -X GET http://localhost:3000/api/immpressions/<objectId>
 *  -H "content-type:application/json" \
 *  -H "x-key:userId" \
 *  -H "x-access-token:accessToken"
 *
 * @apiError ResourceNotFound Requested immpression not found.
 * @apiErrorExample {json} Error-Response:
 *  {
 *    "status": 404,
 *    "message": "Requested immpression not found."
 *  }
 *
 *  @apiSuccess {json} immpression meta data, scene and path of immpression.
 *
 */
exports.getOne = function (req, res) {

  var key = req.headers['x-key'];
  var query = '';

  var criteria = (req.params.id.length < 20)
    ? { 'shortId': req.params.id }
    : { '_id': req.params.id };

  if (req.query.role === "embed") {
    query = criteria;
  } else {

    query = {
      $and: [
        criteria,
        {
          $or: [
            {'meta.viewers': "*"},
            {'meta.viewers': key},
            {'meta.editors': "*"},
            {'meta.editors': key},
            {'meta.owner': key}
          ]
        }
      ]
    };

  }

  ImmpressionMdl.findOne(query , function(err, imm) {
    if(err) { return res.status(500).send(err); }
    if(!imm) { res.status(404).json({ status: 404, message: "Requested immpresion not found." }); }

    res.json(imm);
  })

};

/**
 * @api {post} /api/immpressions [owner] create one
 * @apiDescription Create a new immpression. Note that the parameters are nested sub-document under meta{}.
 * For example, you have to pass meta.name to create a "name" field. See request example for more details.
 * @apiVersion 0.1.0
 * @apiName CreateImmpression
 * @apiGroup Immpression
 * @apiPermission user
 *
 * @apiHeader {String} x-key A userId
 * @apiHeader {String} x-access-token A User accessToken
 *
 * @apiParam {String} meta.name="unnamed" Name
 * @apiParam {String} [meta.description] Description
 * @apiParam {String} meta.template="blank" Template
 * @apiParam {String} meta.thumbnail="default-thumb.jpg" Thumbnail
 * @apiParam {String} meta.category="none" Category
 * @apiParam {Array} [meta.tags] Tags
 * @apiParam {String} meta.originator="userId" Originator
 * @apiParam {String} meta.owner="userId" Immpression's owner
 * @apiParam {Array} meta.editors='["*"]' A list of editors ["userId_1", "userId_2", ... ]
 * @apiParam {Array} meta.viewers='["*"]' A list of viewers ["userId_1", "userId_2", ... ]
 * @apiParam {Array} meta.browsers='["*"]' A list of browsers ["userId_1", "userId_2", ... ]
 * @apiParam {Number} meta.nbLikes="0" Number of likes
 * @apiParam {Number} meta.nbViews="0" Number of views
 * @apiParam {Mixed} path
 * @apiParam {Mixed} scene
 * @apiParam {Mixed} states
 *
 * @apiParamExample {json} Request-Example:
 {
     "meta": {
        "name": "immpression name",
         "category": "sport",
         "editors": ["userId_1", "userId_2"]
     }
 }
 *
 * @apiExample {curl} Example usage:
 * curl -v -X POST http://localhost:3000/api/immpressions/<id>
 * -H "content-type: application/json" \
 * -H "x-key:userId" -H "x-access-token:accessToken" \
 * -d '{ "meta": { "name": "my_imm"}, {"template": "my_template"} }'
 *
 */
exports.createOne = function(req, res) {

  var key = req.headers['x-key'];

  if (req.body.meta === undefined || !req.body.meta.name) {
      res.status(403).json({status: 403, message:"Field meta.name required"});
  }

  var imm = new ImmpressionMdl(req.body);
  imm.meta.originator = key;
  imm.meta.owner = key;
  imm.meta.tsCreated = new Date();

  imm.save(function(err) {
    if(err) { return res.status(500).send(err); }

    res.json({ message: "New immpression created.", shortId: imm.shortId });
  })

};

/**
 * @api {put} /api/immpressions/:id [owner, editor] update one
 * @apiDescription Update an immpression that the requesting user is the owner or editor
 * @apiVersion 0.1.0
 * @apiName UpdateImmpression
 * @apiGroup Immpression
 * @apiPermission user
 *
 * @apiHeader {String} x-key A userId
 * @apiHeader {String} x-access-token A User accessToken
 *
 * @apiParam {String} meta.name="unnamed" Name
 * @apiParam {String} [meta.description] Description
 * @apiParam {String} meta.template="blank" Template
 * @apiParam {String} meta.thumbnail="default-thumb.jpg" Thumbnail
 * @apiParam {String} meta.category="none" Category
 * @apiParam {Array} [meta.tags] Tags
 * @apiParam {String} meta.owner="userId" Immpression's owner
 * @apiParam {Array} meta.editors='["*"]' A list of editors ["userId_1", "userId_2", ... ]
 * @apiParam {Array} meta.viewers='["*"]' A list of viewers ["userId_1", "userId_2", ... ]
 * @apiParam {Array} meta.browsers='["*"]' A list of browsers ["userId_1", "userId_2", ... ]
 * @apiParam {Number} meta.nbLikes="0" Number of likes
 * @apiParam {Number} meta.nbViews="0" Number of views
 * @apiParam {Mixed} path
 * @apiParam {Mixed} scene
 * @apiParam {Mixed} states
 *
 *  * @apiParamExample {json} Request-Example:
 {
     "meta": {
        "name": "immpression name",
         "category": "sport",
         "editors": ["userId_1", "userId_2"]
     }
 }
 *
 *  @apiExample {curl} Example usage: Check immpressions schema for all available fields
 *  curl -v -X PUT http://localhost:3000/api/immpressions/<id>
 *  -H "content-type: application/json" \
 *  -H "x-key:userId" \
 *  -H "x-access-token:accessToken" \
 *  -d '{ "meta": { "name": "my_imm"}, {"template": "my_template"} }'
 */
exports.updateOne = function(req, res) {

  var key = req.headers['x-key'];

  var criteria = (req.params.id.length < 20)
    ? { 'shortId': req.params.id }
    : { '_id': req.params.id };

  var query = { $and: [
    criteria ,
    { $or: [{'meta.owner': key}, {'meta.editors.name': key}, {'meta.editors': "*"}] }
  ] };

  ImmpressionMdl.findOne(query, function(err, imm) {
    if(err) { return res.status(500).send(err); }
    if(!imm) { res.status(401).json({ status: 401, message: "An immpression not found." }); }

    // Update originator is not allowed
    //if (req.body.meta.originator) {
    //  res.status(401).json( {status: 401, message: "Modifying originator is not allowed"} );
    //}

    // Update owner is not allowed if you are not the owner of this immpression
    if (req.body.meta.owner ) {
      if (key !== imm.meta.owner)
        res.status(401).json( {status: 401, message: "Modifying owner is not allowed! You are not the owner"} );
    }

    // TODO find a better way to update the followings (e.g. for loop, etc)
    if (req.body.meta.name) imm.meta.name = req.body.meta.name;
    if (req.body.meta.description) imm.meta.description = req.body.meta.description;
    if (req.body.meta.template) imm.meta.template = req.body.meta.template;
    if (req.body.meta.thumbnail) imm.meta.thumbnail = req.body.meta.thumbnail;
    if (req.body.meta.category) imm.meta.category = req.body.meta.category;
    if (req.body.meta.tags) imm.meta.tags = req.body.meta.tags;
    if (req.body.meta.owner) imm.meta.owner = req.body.meta.owner;
    if (req.body.meta.editors) imm.meta.editors = req.body.meta.editors;
    if (req.body.meta.viewers) imm.meta.viewers = req.body.meta.viewers;
    if (req.body.meta.browsers) imm.meta.browsers = req.body.meta.browsers;
    if (req.body.meta.nbLikes) imm.meta.nbLikes = req.body.meta.nbLikes;
    if (req.body.meta.nbViews) imm.meta.nbViews = req.body.meta.nbViews;
    imm.meta.tsModified = new Date();

    if (req.body.scene) { imm.scene = req.body.scene; }
    if (req.body.path) { imm.path = req.body.path; }
    if (req.body.states) { imm.state = req.body.states; }

    imm.increment();
    imm.save(function (err) {
      if(err) { return res.status(500).send(err); }

      res.json({ message: 'An immpresion updated.' });
    })
  })

};

/**
 * @api {delete} /api/immpressions/:id [owner] delete one
 * @apiDescription Delete an immpression owned by the requesting user
 * @apiVersion 0.1.0
 * @apiName DeleteImmpression
 * @apiGroup Immpression
 * @apiPermission user
 *
 * @apiHeader {String} x-key A userId
 * @apiHeader {String} x-access-token A User accessToken
 *
 *  @apiExample {curl} Example usage:
 *  curl -v  -X DELETE http://localhost:3000/api/immpressions/<id> \
 *  -H "content-type: application/json" \
 *  -H "x-key:userId" \
 *  -H "x-access-token:accessToken"
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

  ImmpressionMdl.findOne(query, function(err, imm) {
    if(err) { return res.status(500).send(err); }
    if(!imm) { res.status(404).json({ status: 404, message: "Immpression not found" }); }
  });

  ImmpressionMdl.findOneAndRemove(query, function(err) {
    if(err) { res.json({ status: 500, message: "Failed to delete DB" }); }
    res.json({ message: "An immpresion removed." });
  })

};