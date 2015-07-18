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

    // used to speedup concurrent gets of the same key
    atomicsDb._fetchers = {};

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
        // create async tasks
        tasks[key] = function __tryCounter(callback) {
            var committer = false;

            // if there isn't another batch handling the counter, this will be the
            // committer for this key
            if (!this._counters[key]) {
                // init batch
                this._counters[key] = [];

                committer = true;
            }

            var batch = this._counters[key];

            batch.length;

            // add this entry to batch
            batch.push({
                delta:    parseInt(tuples[key], 10),
                callback: function (err, value) {
                    callback(err, value);
                }
            });

            // if this is the committer for the key, prepare to update it
            if (committer) {
                // lock and get key
                _lockAndGet(this, key, options, function __handleLockAndGet(oldValue, callback) {
                    // if no oldValue, use initial
                    var newValue = (oldValue === undefined) ? initial : parseInt(oldValue, 10) + tuples[key]; // TODO: make initial required in doc

                    // remove batch
                    delete this._counters[key];

                    var tmp = newValue;

                    // prepare to call back others waiting, including own callback
                    batch[0].err   = null;
                    batch[0].value = tmp;

                    for (var i = 1; i < batch.length; i++) {
                        tmp += batch[i].delta;

                        batch[i].err   = null;
                        batch[i].value = tmp;
                    }

                    // update the key
                    this._put(key, tmp, options, function __handlePut(err) {
                        if (err) {
                            return callback(err, true); // true to signal to keep any current batch, since it's a new batch
                        }

                        _callbackCounters(this, batch);

                        // all done
                        return callback();
                    });
                }.bind(this), function __handleCounterUpdate(err, keepBatch) {
                    if (err) {
                        for (var i = 0; i < batch.length; i++) {
                            batch[i].err   = err;
                            batch[i].value = undefined;
                        }

                        if (!keepBatch) {
                            delete this._counters[key];
                        }

                        return _callbackCounters(this, batch);
                    }
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
        // tasks[key] = _get.bind(null, this, key, options);
        tasks[key] = _collapseGet.bind(null, this, key, options);
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
        tasks[key] = function __tryInsert(callback) {
            // start by quickly checking if the key exists and give up before
            // trying to lock it
            this.get(key, options, function __handleGet(err, res) {
                if (err) {
                    return callback(err);
                }

                var value = res[key];

                // if key already exists, give up
                if (value !== undefined) {
                    return callback(null, true); // key already existed
                }

                // there is a strong chance that the key does not exist, let's
                // lock and get it
                _lockAndGet(this, key, options, function __handle(value, callback) {
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
                }.bind(this), callback);
            }.bind(this));
        }.bind(this);
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

function _collapseGet(db, key, options, callback) {
    var fetcher = false;

    // if there isn't another batch fetching the key, this will be the
    // fetcher for this key
    if (!db._fetchers[key]) {
        // init batch
        db._fetchers[key] = [];

        fetcher = true;
    }

    var batch = db._fetchers[key];

    // add this callback to batch
    var batchPosition = batch.push(callback);
    batchPosition--; // fix 0 indexed position

    // if this is the fetcher for the key, prepare to get it
    if (fetcher) {
        // get the key
        db._get(key, options, function __handleGet(err, value) {
            if (err && !err.notFound) {
                return _callbackGets(db, key, err);
            }

            return _callbackGets(db, key, null, value);
        });
    }
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

function _callbackCounters(db, batch) {
    for (var i = 0; i < batch.length; i++) {
        setImmediate(batch[i].callback, batch[i].err, batch[i].value);
    }

    return;
}

function _callbackGets(db, key, err, value) {
    var batch = db._fetchers[key];

    for (var i = 0; i < batch.length; i++) {
        setImmediate(batch[i], err, value);
    }

    // remove batch
    delete db._fetchers[key];

    return;
}

module.exports = atomics;
