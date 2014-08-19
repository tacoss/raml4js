API-clients for free!
=====================

Simple api-client code generation from RAML sources:

```javascript
var fs = require('fs'),
    raml2js = require('raml2js');

raml2js('/path/to/api.raml', function(err, source) {
    if (err) {
        console.log(err);
    } else {
        fs.writeFileSync('/path/to/api-client.js', source);
    }
});
```

## Usage

The generated client isn't capable to perform any request, you're encouraged to provide a wrapper for this using the `requestHandler` method:

```javascript
var client = require('/path/to/api-client.js');

client.requestHandler(function(method, request_uri, request_options) {
 // custom logic for requesting
});
```

## Work in progress

I'm working on this, isn't ready for production.

Any help will be well received.

## Build status

[![Build Status](https://travis-ci.org/pateketrueke/raml2js.png?branch=master)](https://travis-ci.org/pateketrueke/raml2js)
