'use strict';

/**
 * Module dependencies.
 */
var express = require('express');
var router = express.Router();

var frontend = require('../controllers/frontend');

var uploadObject = require('../middlewares/uploadObject');
var uploadUser = require('../middlewares/uploadUser');
var authenticationUser = require('../controllers/authentications/authenticationUser');
var userEmail = require('../controllers/users/userEmail');
var userPassword = require('../controllers/users/userPassword');
var newsletter = require('../controllers/newsletter');
var message = require('../controllers/message');
var immpressions = require('../controllers/immpressions/immpressions');
var objects = require('../controllers/objects/objects');

// Frontend
router.get('/', frontend.getImmIndex);
router.get('/imm_api', frontend.getImmApi);
router.get('/jsbin/:jsfile', frontend.getJsbin);
router.get('/embed/:id', frontend.getEmbed);
router.get('/view/:id', frontend.viewImm);
router.get('/edit/:id', frontend.editImm);
router.get('/elenaandreas', frontend.getSite);
router.get('/fail', frontend.getFail);
router.get('/secret', frontend.getSecret);
router.get('/scripts/:default', frontend.getScripts);

// Upload
router.get('/upload/objects/:id', uploadObject.formUpload);
router.post('/upload/objects/:id', uploadObject.checkUpload, uploadObject.returnMessageUpload);
router.get('/upload/users/:id', uploadUser.formUpload);
router.post('/upload/users/:id', uploadUser.checkUpload, uploadUser.returnMessageUpload);

// Authentication
router.post('/auth/signup', authenticationUser.signup);
router.get('/auth/signup_verify/:token', authenticationUser.signupVerify);
router.post('/auth/login', authenticationUser.login);
router.get('/auth/logout', authenticationUser.logout);
router.get('/auth/authenticated', authenticationUser.authenticated);

// Newsletter
router.post('/news/subscribe', newsletter.addOne);

// Message
router.post('/api/message', message.addOne);

// User settings
router.put('/api/users/email/:userId', userEmail.updateOne);
router.put('/api/users/password/:userId', userPassword.updateOne);
// User profile setting
//router.get('/api/user/profile/:userId', userProfile.getOne);
//router.put('/api/user/profile/:userId', userProfile.updateOne);

// User account (username and password) setting
//router.put('/api/user/account/:userId', userPassword.updateOne);

// User email setting
//

//
// Immpressions
//

// Logged-in users
router.get('/api/immpressions', immpressions.getAll);
router.get('/api/immpressions/:id', immpressions.getOne);
router.post('/api/immpressions', immpressions.createOne);
router.put('/api/immpressions/:id', immpressions.updateOne);
router.delete('/api/immpressions/:id', immpressions.deleteOne);

// Visitors
//router.get('/immpressions', immpressions.getAllPublic);
//router.get('/immpressions', immpressions.getOnePublic);

//
// Objects
//
router.get('/api/objects', objects.getAll);
router.get('/api/objects/:id', objects.getOne);
router.post('/api/objects', objects.createOne);
router.put('/api/objects/:id', objects.updateOne);
router.delete('/api/objects/:id', objects.deleteOne);

// Visitors
//router.get('/objects', objects.getAllPublic);
//router.get('/objects', objects.getOnePublic);

module.exports = router;