'use strict';

var isArray = require('util').isArray;
var Lock    = require('lock');
var async   = require('async');

var kvOps = {};

function wrap(db) {
    // mix in the methods
    for (var k in kvOps) {
        db[k] = kvOps[k];
    }

    db._lock = new Lock();

    return db;
}

// kvOps.append = function (keys, fragment, callback) {

// };

kvOps.counter = function (keys, delta, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    var tasks = {};

    _array(keys).forEach(function (key) {
        tasks[key] = __lockAndGet.bind(null, this, key, options, function __handle(value, callback) {
// console.log('locked:', key);
            // if no value, use 0 as initial
            if (value === undefined) {
                value = 0;
            }

            var newValue = value + delta;

            this.put(key, newValue, options, function __handlePut(err) {
                if (err) {
                    return callback(err);
                }

                return callback(null, newValue);
            });
        }.bind(this));
    }.bind(this));

    async.parallel(tasks, callback);
};

// kvOps.get = function (keys, options, callback) {

// };

kvOps.insert = function (tuples, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    var tasks = {};

    _array(Object.keys(tuples)).forEach(function (key) {
        tasks[key] = __lockAndGet.bind(null, this, key, options, function __handle(value, callback) {
            // if value already exists, insert fails
            if (value !== undefined) {
                return callback(null, true); // key already existed
            }

            this.put(key, tuples[key], options, function __handlePut(err) {
                if (err) {
                    return callback(err);
                }

                return callback(null, false); // key did not exist
            });
        }.bind(this));
    }.bind(this));

    async.parallel(tasks, function (err, res) {
        if (err) {
            return callback(err);
        }

        var existing = [];

        for (var k in res) {
            if (res[k]) {
                existing.push(k);
            }
        }

        return callback(null, existing);
    });
};

// kvOps.prepend = function (keys, fragment, callback) {

// };

kvOps.replace = function (tuples, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    var tasks = {};

    _array(Object.keys(tuples)).forEach(function (key) {
        tasks[key] = __lockAndGet.bind(null, this, key, options, function __handle(value, callback) {
            // if value does not exist, replace fails
            if (value === undefined) {
                return callback(null, true); // key missing
            }

            this.put(key, tuples[key], options, function __handlePut(err) {
                if (err) {
                    return callback(err);
                }

                return callback(null, false); // key existed
            });
        }.bind(this));
    }.bind(this));

    async.parallel(tasks, function (err, res) {
        if (err) {
            return callback(err);
        }

        var existing = [];

        for (var k in res) {
            if (res[k]) {
                existing.push(k);
            }
        }

        return callback(null, existing);
    });
};

// -----------------------------------------------------------------------------

function __lockAndGet(db, key, options, handler, callback) {
// console.log('locking:', key);
    db._lock(key, function __handleLock(release) {
// console.log('obtained lock:', key);
        db.get(key, options, function __handleGet(err, value) {
// console.log('__handleGet', arguments);
            if (err) {
                if (!err.notFound) {
                    return callback(err);
                } else {
                    value = undefined;
                }
            }

            return handler(value, release(callback));
        });
    });
}

function _array(x) {
    return isArray(x) ? x : [x];
}

module.exports = wrap;
