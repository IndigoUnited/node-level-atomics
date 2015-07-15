'use strict';

var expect  = require('expect.js');
var async   = require('async');
var __throw = require('../util/__throw');
var db      = require('../util/db');

module.exports = function () {
    db = db.get();

    it('should initialize single key with 0 when incrementing', function (done) {
        db.counter({
            'mycounter': 25
        }, function (err, res) {
            __throw(err);

            expect(res.mycounter).to.be(25);

            return done();
        });
    });

    it('should initialize single key with 0 when decrementing', function (done) {
        db.counter({
            'mycounter': -25
        }, function (err, res) {
            __throw(err);

            expect(res.mycounter).to.be(-25);

            return done();
        });
    });

    it('should initialize multiple keys with 0', function (done) {
        db.counter({
            mycounter1: 25,
            mycounter2: 25
        }, function (err, res) {
            __throw(err);

            expect(res.mycounter1).to.be(25);
            expect(res.mycounter2).to.be(25);

            return done();
        });
    });

    it('should increment on existing key', function (done) {
        db.put('mycounter', 10, function (err) {
            __throw(err);

            db.counter({
                mycounter: 25
            }, function (err, res) {
                __throw(err);

                expect(res.mycounter).to.be(35);

                return done();
            });
        });
    });

    it('should decrement on existing key', function (done) {
        db.put('mycounter', 25, function (err) {
            __throw(err);

            db.counter({
                mycounter: -10
            }, function (err, res) {
                __throw(err);

                expect(res.mycounter).to.be(15);

                return done();
            });
        });
    });

    it('should be able to increment in parallel atomically', function (done) {
        var tasks = [];

        var total = 1000,
            delta = 25;

        for (var i = 1; i <= total; i++) {
            tasks.push(db.counter.bind(db, {
                mycounter: delta
            }));
        }

        async.parallel(tasks, function (err) {
            __throw(err);

            db.get('mycounter', function (err, res) {
                expect(res.mycounter).to.be(total * delta);

                return done();
            });
        });
    });
};
