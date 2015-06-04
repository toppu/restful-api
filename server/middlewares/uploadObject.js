'use strict';

/**
 * Module dependencies.
 */
var multer = require('multer');
var path = require('path');
var fs = require('fs');
var fse = require('fs-extra');
var glob = require('glob');

var messages = [];
var filesUpload = [];
var status = [];
var maxCopy = 3; // the maximum copy [1-9]
var fileAccept = ["png", "jpeg", "jpg", "json", "dae"];
var fileSize = 5000000; // bytes
var k = -1;


/**
 * @api {post} /upload/objects/:id Upload object
 * @apiVersion 0.1.0
 * @apiDescription Upload single or multiple objects.
 * - Upload endpoint: /app/assets/objects/objectId
 * - File extension accept: ("png", "jpeg", "jpg", "json", "dae").
 * - File size limit: 5MB
 * - Number of copies allowed: 3 copies
 *
 * @apiName UploadObject
 * @apiGroup Upload
 * @apiPermission user
 *
 * @apiErrorExample {json} Error-Response:
 *  {
 *    "status": 401,
 *    "message": "Upload failed. 3 copies are allowed."
 *  }
 *
 *
 */

var options = {
  dest: path.join(__dirname, '../uploads'),

  rename: function (fieldname, filename) {
    return filename;
  },

  limits: {
    fileSize:fileSize
  },

  changeDest: function(dest, req, res) {
    var stat = null;

    try {
      // using fs.statSync; NOTE that fs.existsSync is now deprecated; fs.accessSync could be used but is only nodejs >= v0.12.0
      stat = fs.statSync(dest);
    } catch(err) {
      // for nested folders, look at npm package "mkdirp"
      fs.mkdirSync(dest);
    }

    if (stat && !stat.isDirectory()) {
      // Woh! This file/link/etc already exists, so isn't a directory. Can't save in it. Handle appropriately.
      throw new Error('Directory cannot be created because an inode of a different type exists at "' + dest + '"');
    }
    return path.join(dest, '../../app/assets/objects/') + req.params.id;
  },

  onFileUploadStart: function (file, req, res) {

    k++;
    filesUpload[k] = file.name;

    if (fileAccept.indexOf(file.extension) === -1) {
      messages[k] = 'Upload failed. ' +fileAccept+ ' are allowed.' ;
      status[k] = 401;
      return false; // terminate uploading file
    } else {
      if (isExceedMaxCopies(file)) {
        messages[k] = 'Upload failed. '+maxCopy+' copies are allowed.';
        status[k] = 401;
        return false; // terminate uploading file
      } else {
        messages[k] = 'Uploaded successful.';
        status[k] = 201;
      }
    }

    function isExceedMaxCopies(file) {

      var copy = '';
      var newPath = '';
      var stat;
      var fileExist;

      // return full path of a file without extension
      function getFile(str, extension) {
        return str.substr(0, str.length - extension.length-1);
      }

      function getCopyFiles(str, extension) {
        return glob.sync(getFile(str, extension)+'([1-'+(maxCopy)+']).'+extension);
      }

      if (typeof file !=='undefined') {

        var files = getCopyFiles(file.path, file.extension);

        if (files.length === 0) {
          copy = '0';
        } else {
          var index = files.length - 1;
          copy = files[index].substring(files[index].lastIndexOf('(') + 1, files[index].lastIndexOf(')'));
        }

        if(copy >= maxCopy) {
          return true;
        }

        // Feb 2015. Node docs now say that fs.existsSync (and fs.exists) "will be deprecated."
        try {
          stat = fs.statSync(file.path);
        }
        catch (e) {
          fileExist = false;
        }

        // 1st upload, filename.extension
        if (!stat && !fileExist && copy === '0') {
          return false;

          // 2nd upload, filename(1).extension
        } else if (stat && copy === '0') {
          newPath = file.path.substr(0, file.path.length - file.extension.length - 1) + '(1).' + file.extension;
          fse.copySync(file.path, newPath);
          return false;

          // >= 3rd upload
        } else {
          newPath = file.path.substr(0, file.path.length - file.extension.length - 1) + '(' + (parseInt(copy) + 1) + ').' + file.extension;
          fse.copySync(file.path, newPath);
          return false;
        }

      } else {
        return true;
      }

    }
  },

  onFileSizeLimit: function (file) {
    messages[k] = 'Upload failed. File exceeds '+fileSize/1000000+ 'MB';
    fse.removeSync(file.path); // delete the partially written file
  },

  onError: function (error, next) {
    messages[k] = 'Upload failed. Something goes wrong.';
    next(error)
  }

};

module.exports = {
  formUpload: function(req, res) {
    res.render(path.join(__dirname, '../../views/object/upload'));
  },

  checkUpload: multer(options),

  returnMessageUpload: function(req, res) {

    var jsonMessage = [];
    for (var i=0; i<k+1; i++) {
      jsonMessage[i] = {"status": status[i], "message": messages[i], "file": filesUpload[i]}
    }
    k = -1;

    res.json(jsonMessage);

  }

};