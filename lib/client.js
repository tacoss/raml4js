
  // hack for embed raml-validation module
  var validate = (function() {
    var exports = {},
        module = { exports: exports };

    <%= raml_validate.split('\n').join('\n    ') %>

    return module.exports();
  })();

  function ParameterError(message, errors, rules) {
    this.message = message;
    this.errors = errors;
    this.rules = rules;
    this.name = 'ParameterError';
  }

  ParameterError.prototype = Error.prototype;

  function validateObject(value, rules) {
    var result = validate(rules)(value),
        errors = [];

    if (!result.valid) {
      throw new ParameterError('invalid arguments', result.errors, rules);
    }
  }

  function validateParameters(names, values, rules) {
    var obj = {};

    for (var key in names) {
      obj[names[key]] = values[key];
    }

    validateObject(obj, rules);
  }

  var defaults = <%= _.e(settings) %>;

  function merge() {
    var target = {};

    for (var index in arguments) {
      var source = arguments[index];

      for (var prop in source) {
        var value = source[prop];

        target[prop] = 'undefined' !== value && null !== value ? value : target[prop];
      }
    }

    return target;
  }

  function replace(value, container, current_key) {
    return value.replace(/\{(\w+)\}/g, function(match, prop) {
      if (current_key === prop) {
        throw new Error('Cannot interpolate self-references for ' + match);
      }

      return container[prop];
    });
  }

  function ApiContainer(settings) {
    this._reset();
    this.options = merge(defaults, settings);
  }

  ApiContainer.prototype._reset = function() {
    this._uriParameters = {};
    this._requestHeaders = {};
  };

  ApiContainer.prototype.request = function(method, request_url, request_options) {
    switch (typeof request_url) {
      case 'object':
        request_options = request_url;
        request_url = request_options.path || '/';
        method = request_options.method || 'GET';
      break;

      default:
        if ('string' === typeof request_options) {
          method = request_options;
          request_options = {};
        } else {
          method = method || 'GET';
          request_options = request_options || {};
        }
      break;
    }

    delete request_options.path;
    delete request_options.method;

    if ('function' !== typeof this._request) {
      throw new Error('Cannot invoke the request-handler');
    }

    return this._request(method, request_url, request_options);
  };

  ApiContainer.prototype.requestHandler = function(callback) {
    if ('function' !== typeof callback) {
      throw new Error('Cannot use ' + callback + ' as request-handler');
    }

    this._request = callback;
  };

  var client = new ApiContainer(overrides);

  function factory(resource) {
    // TODO: return source on chain?
    return {};
  }

  function setter(params, rules, resource) {
    return function() {
      var values = Array.prototype.slice.call(arguments);

      if (rules) {
        validateParameters(params, values, rules);
      }

      for (var key in params) {
        client._uriParameters[params[key]] = values[key];
      }

      return resource();
    };
  }

  function xhr(method, path, rules) {
    return function(params, options, async) {
      if (rules) {
        validateObject(params, rules);
      }

      var uri_params = merge(client._uriParameters, {
        version: client.options.version
      });

      return client.request(method, replace(client.options.baseUri + path, uri_params), { data: params || {} });
    };
  }

<% _.each(resources, function(resource) {
  if (resource.xhr) { %>  client.<%= resource.property.join('.') %><%= 'delete' === resource.method ? '[' + _.e(resource.method) + ']' : '.' + resource.method %> = xhr(<%= _.e(resource.method.toUpperCase()) %>, <%= _.e(resource.path) %>, <%= _.e(resource.queryParameters || null) %>);

<% } else if (resource.keys) { %>  client.<%= resource.property.join('.') %>.<%= resource.method %> = setter(<%= _.e(resource.keys) %>, <%= _.e(resource.uriParameters ? _.pick(resource.uriParameters, resource.keys) : null) %>, function() {
    return client.<%= resource.property.join('.') %>.<%= resource.method %>;
  });

<% } else { %>  client.<%= resource.property.join('.') %> = factory(function() {
    return client.<%= resource.property.join('.') %>;
  });

<% } }); %>  return client;
