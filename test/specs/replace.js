'use strict';

var expect  = require('expect.js');
var __throw = require('../util/__throw');
var db      = require('../util/db');

module.exports = function () {
    db = db.get();

    it('should replace single key', function (done) {
        db.insert({
            some_key: 'now exists'
        }, function (err, misses) {
            __throw(err);

            expect(misses).to.not.contain('some_key1');
            expect(misses.length).to.be(0);

            db.replace({
                some_key: 'has been replaced'
            }, function (err) {
                __throw(err);

                db.get('some_key', function (err, res) {
                    __throw(err);

                    expect(res.some_key).to.be('has been replaced');

                    return done();
                });
            });
        });
    });

    it('should replace multiple keys', function (done) {
        db.insert({
            some_key1: 'now exists1',
            some_key2: 'now exists2'
        }, function (err, misses) {
            __throw(err);

            expect(misses).to.not.contain('some_key1');
            expect(misses).to.not.contain('some_key2');
            expect(misses.length).to.be(0);

            db.replace({
                some_key1: 'has been replaced1',
                some_key2: 'has been replaced2'
            }, function (err) {
                __throw(err);

                db.get(['some_key1', 'some_key2'], function (err, res) {
                    expect(res.some_key1).to.be('has been replaced1');
                    expect(res.some_key2).to.be('has been replaced2');
                });

                return done();
            });
        });
    });

    it('should fail if single key does not exist', function (done) {
        db.replace({
            some_key: 'does not exist'
        }, function (err, misses) {
            __throw(err);

            expect(misses).to.contain('some_key');
            expect(misses.length).to.be(1);

            db.get('some_key', function (err, res, misses) {
                __throw(err);

                expect(res.some_key).to.not.be.ok();
                expect(misses).to.contain('some_key');
                expect(misses.length).to.be(1);

                return done();
            });
        });
    });

    it('should fail if multiple keys do not exist', function (done) {
        db.replace({
            some_key1: 'does not exist1',
            some_key2: 'does not exist2',
        }, function (err, misses) {
            __throw(err);

            expect(misses).to.contain('some_key1');
            expect(misses).to.contain('some_key2');
            expect(misses.length).to.be(2);


            db.get(['some_key1', 'some_key2'], function (err, res, misses) {
                __throw(err);

                expect(res.some_key1).to.not.be.ok();
                expect(res.some_key2).to.not.be.ok();
                expect(misses).to.contain('some_key1');
                expect(misses).to.contain('some_key2');
                expect(misses.length).to.be(2);

                return done();
            });
        });
    });

    it('should fail if some key in multiple keys does not exist', function (done) {
        db.insert({
            some_key1: 'now exists1',
            some_key2: 'now exists2'
        }, function (err) {
            __throw(err);

            db.replace({
                some_key1: 'has been replaced1',
                some_key2: 'has been replaced2',
                some_key3: 'should be replaced3'
            }, function (err, misses) {
                __throw(err);

                expect(misses).to.not.contain('some_key1');
                expect(misses).to.not.contain('some_key2');
                expect(misses).to.contain('some_key3');

                db.get(['some_key1', 'some_key2', 'some_key3'], function (err, res, misses) {
                    __throw(err);

                    expect(res.some_key1).to.be.ok();
                    expect(res.some_key2).to.be.ok();
                    expect(res.some_key3).to.not.be.ok();
                    expect(misses).to.not.contain('some_key1');
                    expect(misses).to.not.contain('some_key2');
                    expect(misses).to.contain('some_key3');
                    expect(misses.length).to.be(1);

                    expect(res.some_key1).to.be('has been replaced1');
                    expect(res.some_key2).to.be('has been replaced2');

                    return done();
                });
            });
        });
    });
};
