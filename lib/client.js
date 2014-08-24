
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
    this._uriParams = {};
    this._queryParams = {};
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

  function setter(param) {
    return function(value) {
      client._uriParams[param] = value;

      return this[param];
    };
  }

  function xhr(method, path) {
    return function(params) {
      // TODO: expand!
      var uri_params = {
        version: client.options.version
      };

      var url = client.options.baseUri + path,
          data = merge(client._queryParams, params);
          params = merge(client._uriParams, uri_params);

      return client.request(method, replace(url, params), { data: data });
    };
  }

<% _.each(resources, function(resource) {
  if (resource.xhr) { %>  client.<%= resource.property.join('.') %><%= 'delete' === resource.method ? '[' + _.e(resource.method) + ']' : '.' + resource.method %> = xhr(<%= _.e(resource.method.toUpperCase()) %>, <%= _.e(resource.path) %>);

<% } else if (resource.keys) { %>  client.<%= resource.property.join('.') %>.<%= resource.method %> = setter(<%= _.e(resource.keys) %>);

<% } else { %>  client.<%= resource.property.join('.') %> = factory(function() {
    return client.<%= resource.property.join('.') %>;
  });

<% } }); %>  return client;
