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

    // used to speed up concurrent increments
    atomicsDb._counters = {};

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

    var tasks = {},
        initial;

    if (options.hasOwnProperty('initial')) {
        initial = options.initial;
        delete options.initial;
    }

    _array(Object.keys(tuples)).forEach(function (key) {
        var committer = false;

        // if there isn't another batch handling the counter, this will be the
        // committer for this key
        if (!this._counters[key]) {
            // init batch
            this._counters[key] = [];

            committer = true;
        }

        var batch = this._counters[key];

        // create async tasks
        tasks[key] = function __signalCounter(callback) {
            // add this entry to batch
            var batchPosition = batch.push({
                delta:    parseInt(tuples[key], 10),
                callback: callback
            });
            batchPosition--; // fix 0 indexed position

            // if this is the committer for the key, prepare to update it
            if (committer) {
                // get the key
                this._get(key, options, function __handleGet(err, oldValue) {
                    if (err && !err.notFound) {
                        return callback(err);
                    }

                    // if no oldValue, use initial
                    var newValue = (oldValue === undefined) ? initial : parseInt(oldValue, 10) + tuples[key]; // TODO: make initial required in doc

                    // remove batch
                    delete this._counters[key];

                    var tmp = newValue;

                    var callbacks = [];

                    // prepare to call back others waiting, including own callback
                    callbacks.push(batch[0].callback.bind(null, null, tmp));

                    for (var i = 1; i < batch.length; i++) {
                        tmp += batch[i].delta;

                        callbacks.push(batch[i].callback.bind(null, null, tmp));
                    }

                    // update the key
                    this._put(key, tmp, options, function __handlePut(err) {
                        if (err) {
                            return callback(err);
                        }

                        // callback everyone waiting
                        for (var i = 0; i < callbacks.length; i++) {
                            setImmediate(callbacks[i]);
                        }
                    });
                }.bind(this));
            }
        }.bind(this);
    }.bind(this));

    // console.log('executing', tasks);

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
