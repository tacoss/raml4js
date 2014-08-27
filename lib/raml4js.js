var fs = require('fs'),
    tv4 = require('tv4'),
    _ = require('lodash'),
    http = require('http'),
    raml = require('raml-parser'),
    client = _.template(fs.readFileSync(__dirname + '/client.js').toString()),
    raml_validate = fs.readFileSync(require.resolve('raml-validate')).toString();

var defaults = _.partialRight(_.assign, function(a, b) {
  return 'undefined' === typeof a ? b : a;
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

function debug(logger) {
  var args = Array.prototype.slice.call(arguments, 1);

  if ('function' === typeof logger) {
    logger.apply(null, args);
  }
}

function parse(data, label) {
  try {
    return JSON.parse(data);
  } catch (e) {
    throw new Error('invalid JSON for ' + label + '\n' + e + '\n' + data);
  }
}

function runTasks(subtasks, callback) {
  function async(arr, task, next) {
    if (!subtasks.length) {
      return callback();
    }

    var completed = 0;

    arr.forEach(function(value) {
      task(value, function(err) {
        if (err) {
          next(err);
        } else {
          completed += 1;

          if (arr.length <= completed) {
            next();
          }
        }
      });
    });
  }

  async(subtasks, function(task, done) {
    return task(done);
  }, function(err) {
    if (err) {
      throw new Error(err);
    }

    callback();
  });
}

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

function extractRefs(schema) {
  var retval = [];

  _.each(schema.properties, function(property, name) {
    if (/^https?:\/\//.test(property.$ref)) {
      retval.push(property.$ref);
    }

    if (property.properties) {
      retval = retval.concat(extractRefs(property));
    }
  });

  return retval;
}

function extractSchemas(schema, parent) {
  var retval = [];

  if (!schema.resources) {
    throw new Error('no resources given' + (parent.length ? ' for ' + parent.join('') : ''));
  }

  _.each(schema.resources, function(resource) {
    var parts = parent.concat([resource.relativeUri]),
        debug_route = parts.join('');

    if (!resource.methods) {
      throw new Error('no methods given for ' + debug_route);
    }

    _.each(resource.methods, function(method) {
      var debug_request = method.method.toUpperCase() + ' ' + debug_route;

      if (!method.responses) {
        throw new Error('no responses given for ' + debug_request);
      }

      _.each(method.responses, function(response, status) {
        var debug_response = debug_request + ' [statusCode: ' + status + ']';

        if (!response) {
          throw new Error('missing response for ' + debug_response);
        }

        if (!response.body) {
          throw new Error('missing body for ' + debug_response);
        }

        _.each(response.body, function(body, type) {
          var debug_body = debug_response + ' [Content-Type: ' + type + ']';

          if (!body) {
            throw new Error('missing body for ' + debug_body);
          }

          if (!body.schema) {
            throw new Error('missing schema for ' + debug_body);
          }

          if (!body.example) {
            throw new Error('missing example for ' + debug_body);
          }

          retval.push({
            description: method.description,
            schema: parse(body.schema, 'schema for ' + debug_body),
            example: parse(body.example, 'example for ' + debug_body),
            method: method.method.toUpperCase(),
            path: parts.join(''),
            debug: debug_body
          });
        });
      });
    });

    if (resource.resources) {
      retval = retval.concat(extractSchemas(resource, parts));
    }
  });

  return retval;
}

function downloadSchemas(sources) {
  return function(next) {
    var subtasks = [];

    _.each(sources, function(url) {
      subtasks.push(function(next) {
        http.get(url, function(res) {
          var body = '';

          res.on('data', function(chunk) {
            body += chunk;
          });

          res.on('end', function() {
            tv4.addSchema(url, parse(body, url));
            next();
          });

        }).on('error', function(err) {
          next('cannot reach ' + url);
        });
      });
    });

    runTasks(subtasks, next);
  };
}

function validateRaml(logger) {
  return function(params) {
    var result = tv4.validateMultiple(params.example, params.schema);

    if (params.description) {
      debug(logger, 'label', params);
    }

    debug(logger, 'resource', params);

    if (result.valid) {
      debug(logger, 'success', params);
    } else {
      debug(logger, 'warning', params);

      if (result.errors.length) {
        result.errors.forEach(function(err) {
          debug(logger, 'error', err);
        });
      }
    }

    if (result.missing.length) {
      result.missing.forEach(function(set) {
        debug(logger, 'missing', set);
      });
    }
  };
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

  /* jshint evil:true */
  return new Function('overrides', client({
    settings: params,
    resources: methods,
    raml_validate: raml_validate
  }));
};

module.exports.validate = function(obj, logger, callback) {
  if (!callback) {
    callback = logger;
    logger = function(type, obj) {
      console.log('raml4js.log.' + type, obj);
    };
  }

  if ('object' !== typeof obj || !obj.data) {
    throw new Error('missing data-property as RAML-object');
  }

  function done(result) {
    if ('function' === typeof callback) {
      callback(result);
    }
  }

  if (obj.schemas) {
    _.each(obj.schemas, function(schema, id) {
      if (!schema.id) {
        schema.id = id;
      }

      tv4.addSchema(schema.id, schema);
    });
  }

  debug(logger, 'root', obj.data);

  try {
    var references = [],
        subtasks = [],
        schemas = extractSchemas(obj.data, []);

    schemas.forEach(function(params) {
      if (!params.schema.id) {
        throw new Error('missing schema-id for ' + params.debug);
      }

      tv4.addSchema(params.schema.id, params.schema);

      extractRefs(params.schema).forEach(function(url) {
        if (-1 === references.indexOf(url)) {
          references.push(url);
        }
      });
    });

    subtasks.push(downloadSchemas(references.filter(function(url) {
      return !tv4.getSchema(url);
    })));

    runTasks(subtasks, function() {
      schemas.forEach(validateRaml(logger));
      done();
    });
  } catch (e) {
    done(e);
  }
};