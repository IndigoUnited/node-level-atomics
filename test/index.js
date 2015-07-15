'use strict';

var db = require('./util/db');

var counterSpecs = require('./specs/counter');
var insertSpecs  = require('./specs/insert');
var replaceSpecs = require('./specs/replace');
var getSpecs     = require('./specs/get');
var putSpecs     = require('./specs/put');
var delSpecs     = require('./specs/del');
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
describe('put',     putSpecs);
describe('del',     delSpecs);
describe('tuple',   tupleSpecs);

// -----------------------------------------------------------------------------

