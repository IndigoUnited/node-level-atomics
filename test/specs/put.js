'use strict';

var expect  = require('expect.js');
var __throw = require('../util/__throw');
var db      = require('../util/db');

module.exports = function () {
    db = db.get();

    it('should put single key', function (done) {
        db.insert({
            some_key: 'now exists'
        }, function (err) {
            __throw(err);

            db.get('some_key', function (err, res) {
                __throw(err);

                expect(res.some_key).to.be('now exists');

                return done();
            });
        });
    });

    it('should put multiple keys', function (done) {
        db.insert({
            some_key1: 'now exists1',
            some_key2: 'now exists2'
        }, function (err) {
            __throw(err);

            db.get(['some_key1', 'some_key2'], function (err, res) {
                expect(res.some_key1).to.be('now exists1');
                expect(res.some_key2).to.be('now exists2');
            });

            return done();
        });
    });

};
