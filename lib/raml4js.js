'use strict';

var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    raml = require('raml-parser');

var client = _.template(fs.readFileSync(path.join(__dirname, 'client.tpl')).toString()),
    raml_validate = fs.readFileSync(require.resolve('raml-validate')).toString();

var defaults = _.partialRight(_.assign, function(a, b) {
  return typeof a === 'undefined' ? b : a;
});

var api_config = {
  title: 'Untitled API',
  version: 'v1',
  baseUri: 'http://site.com/api/{version}',
  baseUriParameters: {},
  uriParameters: {}
};

_.e = function(value) {
  return JSON.stringify(value);
};

function flattenSchema(data) {
  var source = [],
      current_path = arguments[1] || [],
      cached_properties = arguments[2] || {};

  _.each(data.resources, function(resource) {
    var parts = current_path.concat(resource.relativeUriPathSegments),
        property = [];

    _.each(parts, function(key) {
      var cached_key = property.concat([key]).join('@'),
          regular_key = key.replace(/\{(\w+)\}/g, '$1').replace(/\W+/g, '_');

      if (!cached_properties[cached_key]) {
        var matched_keys = _.map(key.match(/\{\w+\}/g), function(match) {
          return match.substr(1, match.length - 2);
        });

        if (matched_keys.length) {
          source.push({
            keys: matched_keys,
            method: regular_key,
            depth: property.length,
            property: property.slice(),
            uriParameters: resource.uriParameters
          });
        } else {
          source.push({
            depth: property.length,
            property: property.concat([regular_key])
          });
        }

        cached_properties[cached_key] = 1;
      }

      property.push(regular_key);
    });

    _.each(resource.methods, function(method) {
      source.push({
        xhr: true,
        path: '/' + parts.join('/'),
        method: method.method,
        depth: property.length,
        property: property.slice(),
        queryParameters: method.queryParameters
      });
    });

    if (resource.resources) {
      source = source.concat(flattenSchema(resource, parts, cached_properties));
    }
  });

  return source;
}

module.exports = function(file, callback) {
  module.exports.read(file, callback);
};

module.exports.read = function(file, callback) {
  return raml.loadFile(file).then(function(data) {
    callback(null, data);
  }, function(err) {
    callback(err);
  });
};

module.exports.client = function(data) {
  var params = _.pick(data, Object.keys(api_config)),
      methods = _.sortBy(flattenSchema(data), 'depth');

  defaults(params, api_config);

  return new Function('overrides', client({
    settings: params,
    resources: methods,
    raml_validate: raml_validate
  }));
};
