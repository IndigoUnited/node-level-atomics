'use strict';

var expect  = require('expect.js');
var async   = require('async');
var __throw = require('../util/__throw');
var db      = require('../util/db');

module.exports = function () {
    db = db.get();

    it('should insert single key', function (done) {
        db.insert({
            some_key: 'now exists'
        }, function (err, existing) {
            __throw(err);

            expect(existing).to.not.contain('some_key1');
            expect(existing.length).to.be(0);

            db.get('some_key', function (err, res) {
                __throw(err);

                expect(res.some_key).to.be('now exists');

                return done();
            });
        });
    });

    it('should insert multiple keys', function (done) {
        db.insert({
            some_key1: 'now exists1',
            some_key2: 'now exists2'
        }, function (err, existing) {
            __throw(err);

            expect(existing).to.not.contain('some_key1');
            expect(existing).to.not.contain('some_key2');
            expect(existing.length).to.be(0);

            db.get(['some_key1', 'some_key2'], function (err, res) {
                expect(res.some_key1).to.be('now exists1');
                expect(res.some_key2).to.be('now exists2');
            });

            return done();
        });
    });

    it('should be atomic', function (done) {
        var tasks = {};

        var total = 1000;

        for (var i = 0; i < total; i++) {
            tasks[i] = db.insert.bind(db, {
                'some_key': i
            });
        }

        async.parallel(tasks, function (err, res) {
            __throw(err);

            var totalExisting = 0,
                totalInserted = 0,
                valueInserted;

            for (var k in res) {
                if (res[k].length) {
                    totalExisting += res[k].length;
                } else {
                    totalInserted++;
                    valueInserted = parseInt(k, 10);
                }
            }

            expect(totalExisting).to.be(total - 1);
            expect(totalInserted).to.be(1);

            db.get('some_key', function (err, res) {
                __throw(err);

                expect(res.some_key).to.be(valueInserted);

                return done();
            });
        });
    });

    it('should fail if single key already exists', function (done) {
        db.insert({
            some_key: 'now exists'
        }, function (err, existing) {
            __throw(err);

            expect(existing).to.not.contain('some_key1');
            expect(existing.length).to.be(0);

            db.get('some_key', function (err, res) {
                __throw(err);

                expect(res.some_key).to.be('now exists');

                db.insert({
                    some_key: 'should not insert this'
                }, function (err, existing) {
                    __throw(err);

                    expect(existing).to.contain('some_key');
                    expect(existing.length).to.be(1);

                    return done();
                });
            });
        });
    });

    it('should fail if multiple keys already exists', function (done) {
        db.insert({
            some_key1: 'now exists1',
            some_key2: 'now exists2',
        }, function (err, existing) {
            __throw(err);

            expect(existing).to.not.contain('some_key1');
            expect(existing).to.not.contain('some_key2');
            expect(existing.length).to.be(0);

            db.get(['some_key1', 'some_key2'], function (err, res) {
                __throw(err);

                expect(res.some_key1).to.be('now exists1');
                expect(res.some_key2).to.be('now exists2');

                db.insert({
                    some_key1: 'should not insert 1',
                    some_key2: 'should not insert 2',
                }, function (err, existing) {
                    __throw(err);

                    expect(existing).to.contain('some_key1');
                    expect(existing).to.contain('some_key2');
                    expect(existing.length).to.be(2);

                    return done();
                });
            });
        });
    });

    it('should fail if some key in multiple keys already exists', function (done) {
        db.insert({
            some_key1: 'now exists1'
        }, function (err, existing) {
            __throw(err);

            expect(existing).to.not.contain('some_key1');
            expect(existing.length).to.be(0);

            db.get('some_key1', function (err, res) {
                __throw(err);

                expect(res.some_key1).to.be('now exists1');

                db.insert({
                    some_key1: 'should not insert 1',
                    some_key2: 'should not insert 2',
                }, function (err, existing) {
                    __throw(err);

                    expect(existing).to.contain('some_key1');
                    expect(existing).to.not.contain('some_key2');
                    expect(existing.length).to.be(1);

                    return done();
                });
            });
        });
    });

    it('should be atomic and fast', function (done) {
        this.timeout(0);

        var tasks = {};

        var total = 10000;

        for (var i = 0; i < total; i++) {
            tasks[i] = db.insert.bind(db, {
                'some_key': i
            });
        }
        console.time('insert');
        async.parallel(tasks, function (err, res) {
            console.timeEnd('insert');

            __throw(err);

            var totalExisting = 0,
                totalInserted = 0,
                valueInserted;

            for (var k in res) {
                if (res[k].length) {
                    totalExisting += res[k].length;
                } else {
                    totalInserted++;
                    valueInserted = parseInt(k, 10);
                }
            }

            expect(totalExisting).to.be(total - 1);
            expect(totalInserted).to.be(1);

            db.get('some_key', function (err, res) {
                __throw(err);

                expect(res.some_key).to.be(valueInserted);

                return done();
            });
        });
    });

};
