var fs = require('fs'),
    _ = require('lodash'),
    raml = require('raml-parser'),
    client = _.template(fs.readFileSync(__dirname + '/client.js').toString());

_.e = function(value) {
  return JSON.stringify(value);
};

function flattenSchema(data) {
  return schemaMapper(data, [], {});
}

function schemaMapper(schema, current_path, cached_properties) {
  var source = [];

  _.each(schema.resources, function(resource) {
    var parts = current_path.concat([resource.relativeUri]),
        methods = {},
        property = [];

    var keys = _.filter(parts.join('/').substr(1).replace(/\{(\w+)\}/g, '$1').split(/\/+/), function(part) {
      return part;
    });

    var segments = _.map(parts.join('').match(/\{\w+\}/g), function(part) {
      return part.substr(1, part.length - 2);
    });

    _.each(keys, function(key) {
      var cached_key = property.concat([key]).join('@');

      if (!cached_properties[cached_key]) {
        cached_properties[cached_key] = true;

        source.push({
          setter: -1 < segments.indexOf(key),
          method: key,
          property: property
        });
      }

      property.push(key);
    });

    _.each(resource.methods, function(method) {
      var params = _.map(method.queryParameters, function(param, name) {
        return {
          key: name,
          type: param.type,
          label: param.displayName || name,
          required: !!param.required
        };
      });

      source.push({
        xhr: true,
        method: method.method,
        property: property,
        path: parts.join(''),
        params: params
      });
    });

    if (resource.resources) {
      source = source.concat(schemaMapper(resource, parts, cached_properties));
    }
  });

  return source;
}


module.exports = function(src, callback) {
  raml.loadFile(src).then( function(data) {
    var source;

    try {
      source = client(_.merge({}, { resources: flattenSchema(data) }, _.pick(data, 'title', 'version', 'baseUri')));
    } catch (e) {
      callback(e);
    }

    callback(null, source);
  }, function(err) {
    callback(err);
  });
};
