'use strict';

var isArray = require('util').isArray;
var Lock    = require('lock');
var async   = require('async');

var kvOps = {};

function atomics(db) {
    var atomicsDb = {
        db: db
    };

    // copy all functions from db
    for (var k in db) {
        if (typeof db[k] === 'function') {
            atomicsDb[k] = db[k].bind(db);
        }
    }

    // mix in the methods
    for (k in kvOps) {
        // some methods overlap, save the original ones under '_' + method
        if (atomicsDb[k]) {
            atomicsDb['_' + k] = atomicsDb[k];
        }

        atomicsDb[k] = kvOps[k];
    }

    atomicsDb._lock = new Lock();

    return atomicsDb;
}

atomics.tuple = _tuple;

// kvOps.append = function (keys, fragment, callback) {

// };

kvOps.counter = function (tuples, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    var tasks = {};

    var initial;

    if (options.hasOwnProperty('initial')) {
        initial = options.initial;
        delete options.initial;
    }

    _array(Object.keys(tuples)).forEach(function (key) {
        tasks[key] = _lockAndGet.bind(null, this, key, options, function __handle(value, callback) {
            var newValue;

            // if no value, use initial
            if (value === undefined) {
                // if no initial value, this is a miss
                if (initial === undefined) {
                    return callback(null, undefined);
                }

                // if there is an initial value, use it
                newValue = initial;
            } else {
                // there is a value, sum it to the provided value
                newValue = parseInt(value, 10) + tuples[key];
            }

            this._put(key, newValue, options, function __handlePut(err) {
                if (err) {
                    return callback(err);
                }

                return callback(null, newValue);
            });
        }.bind(this));
    }.bind(this));

    async.parallel(tasks, function __handleGets(err, res) {
        if (err) {
            return callback(err);
        }

        var misses   = [];
        var finalRes = {};

        for (var k in res) {
            if (res[k] === undefined) {
                misses.push(k);
            } else {
                finalRes[k] = res[k];
            }
        }

        return callback(null, finalRes, misses);
    });

    return this;
};

kvOps.del = function (keys, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    var tasks = {};

    _array(keys).forEach(function (key) {
        tasks[key] = _lockAndGet.bind(null, this, key, options, function __handle(value, callback) {
            this._del(key, options, callback);
        }.bind(this));
    }.bind(this));

    async.parallel(tasks, function (err) {
        if (err) {
            return callback(err);
        }

        return callback(null);
    });

    return this;
};

kvOps.get = function (keys, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    var tasks = {};

    _array(keys).forEach(function (key) {
        tasks[key] = _get.bind(null, this, key, options);
    }.bind(this));

    async.parallel(tasks, function __handleGets(err, res) {
        if (err) {
            return callback(err);
        }

        var misses   = [];
        var finalRes = {};

        for (var k in res) {
            if (res[k] === undefined) {
                misses.push(k);
            } else {
                finalRes[k] = res[k];
            }
        }

        return callback(null, finalRes, misses);
    });

    return this;
};

kvOps.insert = function (tuples, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    var tasks = {};

    _array(Object.keys(tuples)).forEach(function (key) {
        tasks[key] = _lockAndGet.bind(null, this, key, options, function __handle(value, callback) {
            // if value already exists, insert fails
            if (value !== undefined) {
                return callback(null, true); // key already existed
            }

            this._put(key, tuples[key], options, function __handlePut(err) {
                if (err) {
                    return callback(err);
                }

                return callback(null, false); // key did not exist
            });
        }.bind(this));
    }.bind(this));

    async.parallel(tasks, function __handleInserts(err, res) {
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

    return this;
};

// kvOps.prepend = function (keys, fragment, callback) {

// };

kvOps.put = function (tuples, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    var tasks = {};

    _array(Object.keys(tuples)).forEach(function (key) {
        tasks[key] = this._put.bind(this, key, tuples[key], options);
    }.bind(this));

    async.parallel(tasks, function __handlePuts(err) {
        if (err) {
            return callback(err);
        }

        return callback();
    });

    return this;
};

kvOps.replace = function (tuples, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options  = {};
    }

    var tasks = {};

    _array(Object.keys(tuples)).forEach(function (key) {
        tasks[key] = _lockAndGet.bind(null, this, key, options, function __handle(value, callback) {
            // if value does not exist, replace fails
            if (value === undefined) {
                return callback(null, true); // key missing
            }

            this._put(key, tuples[key], options, function __handlePut(err) {
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

    return this;
};

// -----------------------------------------------------------------------------

function _lockAndGet(db, key, options, handler, callback) {
    db._lock(key, function __handleLock(release) {
        db.get(key, options, function __handleGet(err, res) {
            if (err) {
                return callback(err);
            }

            return handler(res[key], release(callback));
        });
    });
}

function _get(db, key, options, callback) {
    db._get(key, options, function __handleGet(err, res) {
        if (err) {
            if (err.notFound) {
                return callback(null, undefined);
            }

            return callback(err);
        }

        return callback(null, res);
    });
}

function _array(x) {
    return isArray(x) ? x : [x];
}

function _tuple(k, v) {
    var res = {};

    // if it's a set of keys and respective values
    if (isArray(k)) {
        for (var i = k.length - 1; i >= 0; i--) {
            res[k[i]] = v[i];
        }

        return res;
    }

    // just a key and a value
    res[k] = v;

    return res;
}

module.exports = atomics;
