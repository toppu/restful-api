'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose');
var shortid = require('shortid');
var textSearch = require('mongoose-text-search');

var objectSchema = mongoose.Schema({
  shortId: {
    type: String,
    unique: true,
    default: shortid.generate
  },
  formatVersion: {
    type: String,
    default: "0.1"
  },
  meta: {
    name: {
      type: String,
      require: 'Name required.',
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    thumbnail: {
      type: String,
      default:'default-thumb.jpg'
    },
    category: {
      type: String,
      require: "Category required."
    },
    tags: [String],
    originator: {
      type: String,
      require: true,
      default: ''
    },
    owner: {
      type: String,
      require: true,
      ref: 'User',
      default: '' // userId
    },
    editors: {
      type: Array,
      default: ["*"]
    },
    viewers: {
      type: Array,
      default: ["*"]
    },
    browsers: {
      type: Array,
      default: ["*"]
    },
    tsCreated: Date,
    tsModified: Date,
    nbLikes: {
      type: Number,
      default: 0
    },
    nbViews: {
      type: Number,
      default: 0
    }
  },
  data: mongoose.Schema.Types.Mixed,
  scene: mongoose.Schema.Types.Mixed
});

objectSchema.plugin(textSearch);
objectSchema.index({'meta.name': 'text', 'meta.category': 'text', 'meta.tags': 'text', 'meta.description': 'text'});

module.exports = mongoose.model('Object', objectSchema);