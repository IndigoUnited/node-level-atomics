'use strict';

var expect  = require('expect.js');
var async   = require('async');
var __throw = require('../util/__throw');
var db      = require('../util/db');

module.exports = function () {
    db = db.get();

    it('should initialize single key with provided initial value when incrementing', function (done) {
        db.counter({
            'mycounter': 25
        }, {
            initial: 10
        }, function (err, res, misses) {
            __throw(err);

            expect(res.mycounter).to.be(10);
            expect(misses.length).to.be(0);

            return done();
        });
    });

    it('should initialize single key with provided initial value when decrementing', function (done) {
        db.counter({
            'mycounter': -1
        }, {
            initial: -5
        }, function (err, res, misses) {
            __throw(err);

            expect(res.mycounter).to.be(-5);
            expect(misses.length).to.be(0);

            return done();
        });
    });

    it('should initialize multiple keys with provided initial value', function (done) {
        db.counter({
            mycounter1: 10,
            mycounter2: 10
        }, {
            initial: 5
        }, function (err, res, misses) {
            __throw(err);

            expect(res.mycounter1).to.be(5);
            expect(res.mycounter2).to.be(5);
            expect(misses.length).to.be(0);

            return done();
        });
    });

    it('should increment on existing key', function (done) {
        db.put({ 'mycounter': 10 }, function (err) {
            __throw(err);

            db.counter({
                mycounter: 25
            }, function (err, res, misses) {
                __throw(err);

                expect(res.mycounter).to.be(35);
                expect(misses.length).to.be(0);

                return done();
            });
        });
    });

    it('should increment on multiple existing keys', function (done) {
        db.put({
            mycounter1: 10,
            mycounter2: 5
        }, function (err) {
            __throw(err);

            db.counter({
                mycounter1: 25,
                mycounter2: 2
            }, function (err, res, misses) {
                __throw(err);

                expect(res.mycounter1).to.be(35);
                expect(res.mycounter2).to.be(7);
                expect(misses.length).to.be(0);

                return done();
            });
        });
    });

    it('should decrement on existing key', function (done) {
        db.put({ 'mycounter': 25 }, function (err) {
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
            }, {
                initial: delta
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

    it('should return misses when increment non existent single key without initial value', function (done) {
        db.counter({
            mycounter: 1
        }, function (err, res, misses) {
            __throw(err);

            expect(res.mycounter).to.not.be.ok();

            expect(misses.length).to.be(1);
            expect(misses).to.contain('mycounter');

            return done();
        });
    });

    it('should return misses when increment non existent multiple keys without initial value', function (done) {
        db.counter({
            mycounter1: 1,
            mycounter2: 1,
        }, function (err, res, misses) {
            __throw(err);

            expect(res.mycounter1).to.not.be.ok();
            expect(res.mycounter2).to.not.be.ok();

            expect(misses.length).to.be(2);
            expect(misses).to.contain('mycounter1');
            expect(misses).to.contain('mycounter2');

            return done();
        });
    });

    it('should return misses when only some keys do not exist', function (done) {
        db.put({
            mycounter1: 10
        }, function (err) {
            __throw(err);

            db.counter({
                mycounter1: 1,
                mycounter2: 1,
            }, function (err, res, misses) {
                __throw(err);

                expect(res.mycounter1).to.be(11);
                expect(res.mycounter2).to.not.be.ok();

                expect(misses.length).to.be(1);
                expect(misses).to.contain('mycounter2');

                return done();
            });
        });
    });

    it('should be atomic', function (done) {
        this.timeout(0);
        var tasks = [];

        var total = 10000,
            delta = 1;

        for (var i = 1; i <= total; i++) {
            tasks.push(db.counter.bind(db, {
                mycounter: delta
            }, {
                initial: delta
            }));
        }

        // console.time('counter');
        async.parallel(tasks, function (err) {
            // console.timeEnd('counter');
            __throw(err);

            db.get('mycounter', function (err, res) {
                expect(res.mycounter).to.be(total * delta);

                return done();
            });
        });
    });

    it('should be atomic in chaos', function (done) {
        this.timeout(0);
        var tasks = [];

        var total1 = 10000,
            total2 = 5000,
            delta1 = 1,
            delta2 = 10;

        for (var i = 1; i <= total1; i++) {
            tasks.push(db.counter.bind(db, {
                mycounter:           delta1,
                some_other_counter1: delta2
            }, {
                initial: delta1
            }));
        }

        for (i = 1; i <= total2; i++) {
            tasks.push(db.counter.bind(db, {
                mycounter: delta1,
                some_other_counter1: delta2,
                some_other_counter2: delta2,
                some_other_counter3: delta2
            }, {
                initial: delta2
            }));
        }

        var multiplierTasks = [
            async.parallel.bind(null, tasks),
            async.parallel.bind(null, tasks),
            async.parallel.bind(null, tasks),
            async.parallel.bind(null, tasks),
            async.parallel.bind(null, tasks)
        ];

        // console.time('counter');
        async.parallel(multiplierTasks, function (err) {
            // console.timeEnd('counter');
            __throw(err);

            db.get([
                'mycounter',
                'some_other_counter1',
                'some_other_counter2',
                'some_other_counter3'
            ], function (err, res) {
                expect(res.mycounter).to.be((total1 + total2) * delta1 * multiplierTasks.length);
                expect(res.some_other_counter1).to.be((total1 + total2) * delta2 * multiplierTasks.length - (delta2 - delta1));
                expect(res.some_other_counter2).to.be(total2 * delta2 * multiplierTasks.length);
                expect(res.some_other_counter3).to.be(total2 * delta2 * multiplierTasks.length);

                return done();
            });
        });
    });

};
