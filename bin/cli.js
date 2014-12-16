#!/usr/bin/env node

var pkg = require('../package.json'),
    raml4js = require('../lib/raml4js');

var fs = require('fs'),
    minimist = require('minimist'),
    strip_comments = require('strip-comments');

var argv = minimist(process.argv.slice(2), {
  alias: {
    h: 'help'
  },
  boolean: ['help']
});

function exit(status) {
  process.exit(status);
}

function usage(header) {
  if (header) {
    writeln(header + '\n');
  }

  writeln([
    'Usage: \n',
    '  raml4js src/index.raml <output>'
  ].join(''));
}

function writeln(message) {
  process.stdout.write((message || '') + '\n');
}

function isFile(filepath) {
  return fs.existsSync(filepath) && fs.statSync(filepath).isFile();
}

if (argv.help) {
  writeln(usage());
  exit(1);
}

var input_file = argv._.shift();

if (!input_file) {
  writeln(usage('Missing arguments'));
  exit(1);
}

if (!isFile(input_file)) {
  writeln(usage('Invalid input'));
  exit(1);
}

raml4js(input_file, function(err, data) {
  if (err) {
    writeln(err.toString());
    exit(2);
  }

  var code = raml4js.client(data).toString();

  code = strip_comments(code);
  code = code.replace(/\n{2,}/g, '\n');
  code = code.replace(/\/\*\{|\}\*\//g, '');

  writeln(code);
});
