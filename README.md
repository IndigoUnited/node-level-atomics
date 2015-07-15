# level-atomics

Atomic operators for LevelDB.

[![Build Status](https://travis-ci.org/IndigoUnited/node-level-atomics.svg?branch=master)](https://travis-ci.org/IndigoUnited/node-level-atomics) [![Coverage Status](https://coveralls.io/repos/IndigoUnited/node-level-atomics/badge.svg)](https://coveralls.io/r/IndigoUnited/node-level-atomics) [![Codacy Badge](https://www.codacy.com/project/badge/97a9d41428694d1a978dedb9b36037c7)](https://www.codacy.com/app/me_19/node-level-atomics)

## Installing

`npm install level-atomics`

## Introduction

This module adds a bunch of typical atomic operations, like insert, replace and counter (increment/decrement) to LevelDB, and adds capacity to multiple parallel operations, like multi gets, multi inserts, and so on.

```js
var level   = require('level');
var atomics = require('level-atomics');

var db = atomics(level('./tmp', {
    valueEncoding: 'json' // not required, but makes it easier to handle numbers
}));

db.get(['a', 'b', 'c'], function (err, res, misses) {
    if (err) {
        return console.error('Something went wrong:', err);
    }

    if (misses.length > 1) {
        console.log('These keys do not exist:', misses);
    } else {
        console.log(res.a);
        console.log(res.b);
        console.log(res.c);
    }
});

db.counter({
    some_key: 10
}, function (err, res, misses) {
    if (err) {
        return console.error('Something went wrong:', err);
    }

    console.log(res.some_key); // will log 10
});

```

## API

- [`append`](#db_append) *soon*
- [`counter`](#db_counter)
- [`get`](#db_get)
- [`insert`](#db_insert)
- [`lock`](#db_lock) *soon*
- [`prepend`](#db_prepend) *soon*
- [`remove`](#db_remove) *soon*
- [`replace`](#db_replace)
- [`unlock`](#db_unlock)
- [`upsert`](#db_upsert) *soon*

---

<a name="db_counter"></a>
#### `counter(tuples, [options,] callback) → db`

Increments or decrements the keys' numeric value.

Note that JavaScript does not support 64-bit integers. You might receive an inaccurate value if the number is greater than 53-bits (JavaScript's maximum integer precision).

- `tuples`: tuple (object with keys and respective deltas).
- `options`: same options as (level.put)[https://github.com/Level/levelup#options-1].
- `callback(err, results, cas, misses)`
    - `results`: object with keys and respective values.
    - `misses`: array of keys that don't exist.

---

<a name="db_get"></a>
#### `get(keys, [options,] callback) → db`

Retrieve keys.

- `keys`: array or string.
- `options`: same options as (level.get)[https://github.com/Level/levelup#options-2].
- `callback(err, results, cas, misses)`
    - `results`: object with keys and respective values.
    - `misses`: array of keys that don't exist.

---

<a name="db_insert"></a>
#### `insert(tuples, [options,] callback) → db`

Will fail if the key already exists. Any key that already exists is returned in the callback in the `existing` parameter.

- `tuples`: tuple (object with keys and respective values)
- `options`: same options as (level.put)[https://github.com/Level/levelup#options-1].
- `callback(err, cas, existing)`
    - `existing`: array of keys that already existed, and thus failed to be added.

---

<a name="db_replace"></a>
#### `replace(tuples, [options,] callback) → db`

Identical to [`upsert`](#upsert), but will only succeed if the key exists already (i.e. the inverse of [`insert`](#insert)).

- `tuples`: tuple (object with keys and respective values)
- `options`: same options as (level.put)[https://github.com/Level/levelup#options-1].
- `callback(err, cas, misses)`
    - `misses`: array of keys that don't exist.

---

### Tuples

A tuple is an object with key and respective values, like so:

```js
{
    a: 1,
    b: 2,
    c: 3
}
```

Many operations allow you to provide tuples for *multi operations*. As an example, you could provide the tuple above to `insert`, and the keys `a`, `b` and `c` would be inserted with the respective values.

As syntax sugar, and to avoid creating temporary objects like this:

```js
// ...

var someKey   = 'foo';
var someValue = 'bar';
var tmp       = {};
tmp[someKey]  = someValue;
db.insert(tmp, function (err, res) {
    // ...
});

// ...
```

You can instead do the following:

```js
// ...

var someKey   = 'foo';
var someValue = 'bar';

var tuple = require('level-atomics').tuple;

db.insert(tuple(someKey, someValue), function (err, res) {
    // ...
});

//...
```

You can provide to the `tuple` helper just a key and a value, or you can provide a couple of arrays of equal length, and `tuple` will map each of they keys to the respective values, like so:

```js
tuple(['a', 'b', 'c'], [1, 2, 3]);

// will return
//
// {
//   a: 1,
//   b: 2,
//   c: 3
// }
```

