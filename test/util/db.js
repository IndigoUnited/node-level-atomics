'use strict';

var leveldown = require('leveldown');
var levelup   = require('levelup');
var atomics   = require('../../index');


var location = '../tmp';

var db = atomics(levelup(location, {
    valueEncoding: 'json'
}));

module.exports = {
    get: function () {
        return db;
    },

    init: function (callback) {
        if (db.isOpen()) {
            return callback();
        }

        db.open(function (err) {
            if (err) {
                return callback(err);
            }

            return callback();
        });
    },

    destroy: function (callback) {
        if (!db || !db.isOpen()) {

            return leveldown.destroy(location, callback);
        }

        db.close(function (err) {
            if (err) {
                return callback(err);
            }

            return leveldown.destroy(location, callback);
        });
    }
};
