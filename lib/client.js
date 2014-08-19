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

function interpolate(container) {
  for (var key in container) {
    var value = container[key];

    switch (typeof value) {
      case 'string':
        container[key] = replace(value, container, key);
      break;

      case 'object':
        container[key] = interpolate(value);
      break;
    }
  }

  return container;
}

function ApiContainer(settings, retval) {
  this._reset();
  this._chain = retval;
  this.options = interpolate(settings);
}

ApiContainer.prototype._self = function() {
  return this._chain || this;
};

ApiContainer.prototype._reset = function() {
  this._uriParams = {};
  this._queryParams = {};
  this._requestHeaders = {};
};

ApiContainer.prototype.request = function(method, request_uri, request_options) {
  switch (typeof request_uri) {
    case 'object':
      request_options = request_uri;
      request_uri = request_options.path || '/';
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

  return this._request(method, request_uri, request_options);
};

ApiContainer.prototype.requestHandler = function(callback) {
  if ('function' !== typeof callback) {
    throw new Error('Cannot use ' + callback + ' as request-handler');
  }

  this._request = callback;
};

var defaults = {
  endpoint: <%= _.e(baseUri) %>,
  version: <%= _.e(version) %>,
  title: <%= _.e(title) %>
};

module.exports = function(overrides) {
  var config = merge(defaults, overrides),
      client = new ApiContainer(config);

  function xhr(method, path) {
    return function(params) {
      return client.request(method, replace(client.options.endpoint + path, client._uriParams), {
        data: merge(client._queryParams, params)
      });
    };
  }

  function setter(param, resource) {
    return function(value) {
      client._uriParams[param] = value;

      return resource();
    };
  }

  function factory(resource) {
    return new ApiContainer(config, resource);
  }

<% _.each(resources, function(resource) {
  if (resource.xhr) { %>  client.<%= resource.property.join('.') %>[<%= _.e(resource.method) %>] = xhr(<%= _.e(resource.method.toUpperCase()) %>, <%= _.e(resource.path) %>, function() {
    return client.<%= resource.property.join('.') %>;
  });

<% } else if (resource.setter) { %>  client.<%= resource.property.join('.') %> = setter(<%= _.e(resource.method) %>, function() {
    return client.<%= resource.property.join('.') %>;
  });

<% } else { %>  client.<%= resource.property.join('.') %> = factory(function() {
    return client.<%= resource.property.join('.') %>;
  });

<% } }); %>  return client;
};
