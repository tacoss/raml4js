[![Build Status](https://travis-ci.org/gextech/raml4js.png?branch=master)](https://travis-ci.org/gextech/raml4js) [![NPM version](https://badge.fury.io/js/raml4js.png)](http://badge.fury.io/js/raml4js) [![Coverage Status](https://coveralls.io/repos/gextech/raml4js/badge.png?branch=master)](https://coveralls.io/r/gextech/raml4js?branch=master)

Under the hood `raml4js` uses the extraordinary `raml-parser` to load your RAML:

```javascript
var fs = require('fs'),
    raml4js = require('raml4js');

raml4js('/path/to/api.raml', function(err, data) {
  if (err) {
    // raml-parser errors
  } else {
    // api-client generation for free
    var overrides = { baseUri: 'http://api.other-site.com/{version}' },
        factory = raml4js.client(data),
        client = factory(overrides);

    // save the client factory as CommonJS module
    fs.writeFileSync('/path/to/api-client.js', 'module.exports = ' + factory.toString() + ';');

    // or use the api-client created directly
    // client.path.to.resource.get();
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

Since `0.2.0` the method `validate()` was deprecated in favor of [ramlev](https://github.com/cybertk/ramlev).

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

## Yet another RAML client generator?

Yes, there's an official [raml-client-generator](https://github.com/mulesoft/raml-client-generator) for full-featured Javascript clients.

Both generators produces almost the same client, but `raml4js` doesn't ship any dependency for it.
