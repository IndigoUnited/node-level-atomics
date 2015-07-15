'use strict';

var expect  = require('expect.js');
var __throw = require('../util/__throw');
var db      = require('../util/db');

module.exports = function () {
    db = db.get();

    it('should delete a single existing key', function (done) {
        db.put({ a: 1 }, function (err) {
            __throw(err);

            db.del('a', function (err) {
                __throw(err);

                db.get('a', function (err, res, misses) {
                    __throw(err);

                    expect(misses).to.contain('a');

                    return done();
                });
            });
        });
    });

    it('should delete a single non-existing key', function (done) {
        db.del('a', function (err) {
            __throw(err);

            db.get('a', function (err, res, misses) {
                __throw(err);

                expect(misses).to.contain('a');

                return done();
            });
        });
    });


    it('should delete multiple existing keys', function (done) {
        db.put({
            a: 1,
            b: 1,
            c: 1
        }, function (err) {
            __throw(err);

            db.del(['a', 'b', 'c'], function (err) {
                __throw(err);

                db.get(['a', 'b', 'c'], function (err, res, misses) {
                    __throw(err);

                    expect(misses).to.contain('a');
                    expect(misses).to.contain('b');
                    expect(misses).to.contain('c');

                    return done();
                });
            });
        });
    });

    it('should delete multiple non-existing keys', function (done) {
        db.del(['a', 'b', 'c'], function (err) {
            __throw(err);

            db.get(['a', 'b', 'c'], function (err, res, misses) {
                __throw(err);

                expect(misses).to.contain('a');
                expect(misses).to.contain('b');
                expect(misses).to.contain('c');

                return done();
            });
        });
    });

    it('should delete multiple existing keys, some of which do not exist', function (done) {
        db.put({
            a: 1,
            b: 1,
            c: 1
        }, function (err) {
            __throw(err);

            db.del(['a', 'b', 'c'], function (err) {
                __throw(err);

                db.get(['a', 'b', 'c'], function (err, res, misses) {
                    __throw(err);

                    expect(misses).to.contain('a');
                    expect(misses).to.contain('b');
                    expect(misses).to.contain('c');

                    return done();
                });
            });
        });
    });
};
