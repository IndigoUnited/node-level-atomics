'use strict';

var expect  = require('expect.js');
var __throw = require('../util/__throw');
var db      = require('../util/db');
var tuple   = require('../../index').tuple;

module.exports = function () {
    db = db.get();

    it('should initialize single key with 0 when incrementing', function (done) {
        db.counter(tuple('mycounter', 25), function (err, res) {
            __throw(err);

            expect(res.mycounter).to.be(25);

            return done();
        });
    });


    it('should initialize multiple keys with 0', function (done) {
        db.counter(tuple(['mycounter1', 'mycounter2'], [25, 10]), function (err, res) {
            __throw(err);

            expect(res.mycounter1).to.be(25);
            expect(res.mycounter2).to.be(10);

            return done();
        });
    });
};
