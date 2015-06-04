'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose');
var shortid = require('shortid');
var textSearch = require('mongoose-text-search');

var immpressionSchema = mongoose.Schema({
  shortId: {
    type: String,
    unique: true,
    default: shortid.generate
  },
  formatVersion: {
    type: String,
    default: '0.1'
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
    template: {
      type: String,
      default: 'blank'
    },
    thumbnail: {
      type: String,
      default: 'default-thumb.jpg'
    },
    category: {
      type: String,
      require: 'Category required.'
    },
    tags: [String],
    originator: {
      type: String,
      require: true,
      default: '' // userId
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
  states: mongoose.Schema.Types.Mixed,
  scene: mongoose.Schema.Types.Mixed,
  path: mongoose.Schema.Types.Mixed
});

immpressionSchema.plugin(textSearch);
immpressionSchema.index({'meta.name': 'text', 'meta.category': 'text', 'meta.tags': 'text', 'meta.description': 'text'});

module.exports = mongoose.model('Immpression', immpressionSchema);