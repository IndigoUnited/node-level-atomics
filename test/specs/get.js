'use strict';

var expect  = require('expect.js');
var __throw = require('../util/__throw');
var db      = require('../util/db');
var async   = require('async');

module.exports = function () {
    db = db.get();

    it('should get a single key', function (done) {
        db.insert({
            some_key1: 'some_value1'
        }, function (err) {
            __throw(err);

            db.get('some_key1', function (err, res, misses) {
                __throw(err);

                expect(misses.length).to.be(0);
                expect(res.some_key1).to.be('some_value1');

                return done();
            });
        });
    });

    it('should get multiple keys', function (done) {
        db.insert({
            some_key1: 'some_value1',
            some_key2: 'some_value2',
            some_key3: 'some_value3',
        }, function (err) {
            __throw(err);

            db.get(['some_key1', 'some_key2', 'some_key3'], function (err, res, misses) {
                __throw(err);

                expect(misses.length).to.be(0);
                expect(res.some_key1).to.be('some_value1');
                expect(res.some_key2).to.be('some_value2');
                expect(res.some_key3).to.be('some_value3');

                return done();
            });
        });
    });

    it('should return undefined when getting a single non-existing key', function (done) {
        db.get('non-existing-key', function (err, res, misses) {
            __throw(err);

            expect(res['non-existing-key']).to.be(undefined);
            expect(misses.length).to.be(1);
            expect(misses).to.contain('non-existing-key');

            return done();
        });
    });

    it('should return undefined when getting multiple non-existing keys', function (done) {
        db.insert({
            some_key1: 'some_value1',
            some_key2: 'some_value2',
            some_key3: 'some_value3',
        }, function (err) {
            __throw(err);
            db.get(['non-existing-key-1', 'non-existing-key-2', 'non-existing-key-3', 'some_key1', 'some_key2', 'some_key3'], function (err, res, misses) {
                __throw(err);

                expect(misses).to.contain('non-existing-key-1');
                expect(misses).to.contain('non-existing-key-2');
                expect(misses).to.contain('non-existing-key-3');
                expect(misses.length).to.be(3);
                expect(res.some_key1).to.be('some_value1');
                expect(res.some_key2).to.be('some_value2');
                expect(res.some_key3).to.be('some_value3');

                return done();
            });
        });
    });

    it('should aggregate gets', function (done) {
        db.insert({
            some_key1: 'some_value1',
            some_key2: 'some_value2',
            some_key3: 'some_value3',
        }, function (err) {
            __throw(err);

            var tasks = [];
            var total = 1000;

            for (var i = 0; i < total; i++) {
                tasks.push(db.get.bind(db, ['some_key1', 'some_key2']));
            }
console.time('get');
            async.parallel(tasks, function (err, res) {
                __throw(err);
console.timeEnd('get');
                res.forEach(function (res) {
                    expect(res[0].some_key1).to.be('some_value1');
                    expect(res[0].some_key2).to.be('some_value2');
                    expect(res[1].length).to.be(0);
                });

                return done();
            });
        });
    });

};
