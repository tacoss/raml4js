RAML goodies for Javascript
===========================

Under the hood `raml4js` uses the extraordinary `raml-parser` and `tv4` modules for validation tasks:

```javascript
var fs = require('fs'),
    raml4js = require('raml4js');

raml4js('/path/to/api.raml', function(err, data) {
  if (err) {
    // raml-parser errors
  } else {
    // external schemas
    var schemas = {
        exampleSchema: '{ "$schema": "http://json-schema.org/schema" }'
    };

    raml4js.validate({ data: data, schemas: schemas }, function(type, obj) {
      // raml-validation logging
    }, function(err) {
      if (err) {
        // raml-validation warnings
      }

      // api-client generation for free
      var overrides = { baseUri: 'http://api.other-site.com/{version}' },
          factory = raml4js.client(data),
          client = factory(overrides);

      // save the client factory as CommonJS module
      fs.writeFileSync('/path/to/api-client.js', 'module.exports = ' + factory.toString() + ';');
    });
  }
});
```

## Methods

- `raml4js(file, callback)`
- `raml4js.read(file, callback)`

  Will parse the RAML **file** and then will invoke the **callback(err, data)** function.

  If no error occurs **data** will contain the parsed RAML as object, otherwise **err** will be fulfilled.

- `raml4js.client(data)`

  Generate static code using **data** as RAML object input.

- `raml4js.validate(obj, [logger, ]callback)`

  Will validate the RAML and all its json-schema definitions, **obj** must contain the following `{ data: ramlObject, schemas: externalSchemas }` values.

  &mdash; `schemas` are optional.

  While validation is performed the **logger(type, obj)** function will be invoked.

  There are many log-types: `label`, `resource`, `success`, `warning`, `error`, `missing` and `root`.

  The **obj** represents the current resource under validation.

  &mdash; `logger` is optional.

  Finally the **callback(err)** function will be invoked.

  If everything is fine **err** will be empty.

## Client usage

The generated client isn't capable to perform any request, you're encouraged to provide a wrapper for this using the `requestHandler` method:

```javascript
var http = require('http-api-client'),
    client = require('/path/to/api-client.js')();

client.requestHandler(function(method, request_url, request_options) {
  return http.request({
    method: method,
    url: request_url,
    parameters: request_options.data
  });
});
```

If you have a resource like `GET /articles/{articleId}`, then:

```javascript
client.articles.articleId(1).get().then(function(response) {
  console.log(response.getJSON());
});
```

## Work in progress

I'm working on this, isn't ready for production.

Any help will be well received.

## Build status

[![Build Status](https://travis-ci.org/gextech/raml4js.png?branch=master)](https://travis-ci.org/gextech/raml4js)
