'use strict';

var db = require('./util/db');

var counterSpecs = require('./specs/counter');
var insertSpecs  = require('./specs/insert');
var replaceSpecs = require('./specs/replace');

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

// -----------------------------------------------------------------------------

