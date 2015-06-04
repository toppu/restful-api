'use strict';

/**
 * Module dependencies.
 */
var path = require('path');

exports.getImmIndex = function(req, res) {
  res.sendfile( path.join( __dirname, '../../app/immdex.html' ) );
};

exports.getImmApi = function(req, res) {
  console.log(__dirname);
  res.sendfile( path.join( __dirname, '../../app/scripts/imm_api.js' ) );
};

exports.getJsbin = function (req, res) {
  res.sendfile( path.join( __dirname, '../../app/scripts/jsbin/', req.params.jsfile ) );
};

exports.getEmbed = function(req, res) {
  // TODO embed ?
  //locals_embed = true;
  res.redirect('/#embed/'+req.params.id);
};

/*
exports.getDefault = function(req, res) {
  console.log("redirecting /:default/edit ...");
  res.redirect('/#'+req.params.default+'/edit');
};
*/

exports.viewImm = function(req, res) {
  res.redirect('/#view/'+req.params.id);
};

exports.editImm = function(req, res) {
  res.redirect('/#edit/'+req.params.id);
};

exports.getSite = function(req, res) {
  console.log("redirecting /elenaandreas ...");
  res.redirect('/sites/elenaandreas');
};

exports.getFail = function(req, res) {
  console.log("redirecting /elenaandreas ...");
  res.sendfile( path.join( __dirname, '../../app/fail.html' ) );
};

exports.getSecret = function(req, res) {
  res.sendfile( path.join( __dirname, '../../app/fluid.html' ) );
};

exports.getScripts = function(req, res) {
  console.log("serving script...");
  res.sendfile( path.join( __dirname, req.params.default ) );
};



