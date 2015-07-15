'use strict';

var db = require('./util/db');

var counterSpecs = require('./specs/counter');
var insertSpecs  = require('./specs/insert');
var replaceSpecs = require('./specs/replace');
var getSpecs     = require('./specs/get');
var tupleSpecs   = require('./specs/tuple');

// -----------------------------------------------------------------------------

beforeEach(function (done) {
    db.init(done);
});

afterEach(function (done) {
    db.destroy(done);
});

// -----------------------------------------------------------------------------

describe('counter', counterSpecs);
describe('insert',  insertSpecs);
describe('replace', replaceSpecs);
describe('get',     getSpecs);
describe('tuple',   tupleSpecs);

// -----------------------------------------------------------------------------

