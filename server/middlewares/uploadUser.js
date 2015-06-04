'use strict';

/**
 * Module dependencies.
 */
var multer = require('multer');
var path = require('path');
var fs = require('fs');
var fse = require('fs-extra');
var glob = require('glob');
var exec = require('child_process').exec;

var dirData = '';
var dirUpload = '';
var pptxParser = path.join(__dirname, "/pptxParseService.jar");
var xlsxParser = path.join(__dirname, "/xlsxParseService.jar");
var message = '';
var done = false;
var fileName = '';
var maxCopy = 3; // the maximum copy [1-9]
var fileAccept = ["pptx", "xlsx"];
var fileSize = 5000000; // bytes


/**
 * @api {post} /upload/users/:id Upload user data
 * @apiVersion 0.1.0
 * @apiDescription Upload a single user data.
 * - Upload endpoint:
 * --- /app/users/userId/data
 * --- /app/users/userId/uploads
 * - File extension accept: ("pptx", "xlsx").
 * - File size limit: 5MB
 * - Number of copies allowed: 3 copies
 *
 * @apiName UploadUser
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
    fileSize: fileSize,
    files: 1
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
    dirData = path.join(dest, '../../app/users/') + req.params.id + '/data';
    dirUpload = path.join(dest, '../../app/users/') + req.params.id + '/uploads';
    return dirUpload
  },

  onFileUploadStart: function (file, req, res) {

    if(fileAccept.indexOf(file.extension) === -1) {
      message = 'Upload failed. ' +fileAccept+ ' are allowed.' ;
      return false; // terminate uploading file
    } else {
      if(isExceedMaxCopies(file)) {
        message = 'Upload failed. '+maxCopy+' copies are allowed.';
        return false; // terminate uploading file
      } else {
        done = true; // upload complete, move to next middleware
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
          fileName = file.name;
          return false;

        // 2nd upload, filename(1).extension
        } else if (stat && copy === '0') {
          newPath = file.path.substr(0, file.path.length - file.extension.length - 1) + '(1).' + file.extension;
          fileName = file.name.substr(0, file.name.length - file.extension.length - 1) + '(1).' + file.extension;
          fse.copySync(file.path, newPath);
          return false;

        // >= 3rd upload
        } else {
          newPath = file.path.substr(0, file.path.length - file.extension.length - 1) + '(' + (parseInt(copy) + 1) + ').' + file.extension;
          fileName = file.name.substr(0, file.name.length - file.extension.length - 1) + '(' + (parseInt(copy) + 1) + ').' + file.extension;
          fse.copySync(file.path, newPath);
          return false;
        }

      } else {
        return true;
      }

    }
  },

  onFileSizeLimit: function (file) {
    message = 'Upload failed. File exceeds '+fileSize/1000000+ 'MB';
    fse.removeSync(file.path); // delete the partially written file
  },

  onFilesLimit: function () {
    message = 'Upload failed. Crossed file limit!';
  },

  onError: function (error, next) {
    message = 'Upload failed. Something goes wrong.';
    next(error)
  }

};

module.exports = {
  formUpload: function(req, res) {
    res.render(path.join(__dirname, '../../views/user/upload'));
  },

  checkUpload: multer(options),
  returnMessageUpload: function(req, res) {

    var file = req.files.userFile;
    var pttPath = dirUpload+ '/' +fileName.replace('(','\\(').replace(')','\\)');
    var jsonPath = dirData+ '/' +fileName+ '.json';
    var parser;

    if(done && typeof file !== 'undefined') {

      if(file.extension === 'xlsx') parser = xlsxParser;
      if(file.extension === 'pptx') parser = pptxParser;

      exec('java -jar ' +parser+ ' ' +pttPath, function(err, stdout, stderr){
        if(stderr) {
          res.json({status: 401, message: stderr});
        } else if (stdout.trim() === 'success') {
          fse.copySync(path.join(__dirname, "../../pptx.json"), jsonPath);
          fs.readFile(jsonPath, 'utf8', function(err, data){
            if (err) {
              res.json({status: 500, message: "Read file error", file: jsonPath})
            }
            res.json(JSON.parse(data));
          });
        } else {
          res.json({status: 401, message: "Parse error!"})
        }
      });

    } else {
      res.json({status: 401, message: message});
    }

  }
};