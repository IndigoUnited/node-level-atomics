'use strict';

var async     = require('async');
var expect    = require('expect.js');
var atomics   = require('../index');
var leveldown = require('leveldown');
var levelup   = require('levelup');

// -----------------------------------------------------------------------------

var db;

beforeEach(function (done) {
    var location = '../tmp';

    leveldown.destroy(location, function (err) {
        if (err) {
            return done(err);
        }

        db = atomics(levelup(location, {
            valueEncoding: 'json'
        }));

        return done();
    });
});

afterEach(function (done) {
    db.close(done);
});

// -----------------------------------------------------------------------------

describe('counter', function () {
    it('should initialize single key with 0', function (done) {
        db.counter('mycounter', 25, function (err, res) {
            __throw(err);

            expect(res.mycounter).to.be(25);

            return done();
        });
    });

    it('should initialize multiple keys with 0', function (done) {
        db.counter(['mycounter1', 'mycounter2'], 25, function (err, res) {
            __throw(err);

            expect(res.mycounter1).to.be(25);
            expect(res.mycounter2).to.be(25);

            return done();
        });
    });

    it('should increment on existing key', function (done) {
        db.put('mycounter', 10, function (err) {
            __throw(err);

            db.counter('mycounter', 25, function (err, res) {
                __throw(err);

                expect(res.mycounter).to.be(35);

                return done();
            });
        });
    });

    it('should be able to increment in parallel', function (done) {
        var tasks = [];

        var total = 1000,
            delta = 25;

        for (var i = 1; i <= total; i++) {
            tasks.push(db.counter.bind(db, 'mycounter', delta));
        }

        async.parallel(tasks, function (err) {
            __throw(err);

            db.get('mycounter', function (err, value) {
                expect(value).to.be(total * delta);

                return done();
            });
        });
    });

});


// -----------------------------------------------------------------------------

function __throw(err) {
    if (err) {
        throw err;
    }
}
