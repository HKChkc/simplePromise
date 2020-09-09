function HkcPromise(fn) {
  this._state = 'pending';
  this._value = null;
  let done = false;
  try {
    fn(
      value => {
        if (done) return;
        done = true;
        this._state = 'fulfilled';
        this._value = value;
      },
      err => {
        if (done) return;
        done = true;
        this._state = 'rejected';
        this._value = err;
      }
    );
  } catch (err) {
    done = true;
    this._state = 'rejected';
    this._value = err;
  }
}

HkcPromise.prototype.then = function (onFulfilled, onRejected) {
  let newPromise = new HkcPromise(function () {});
  let cb = this._state === 'fulfilled' ? onFulfilled : onRejected;
  if (!cb) {
    newPromise._state = this._state;
    newPromise._value = this._value;
    return newPromise;
  }
  try {
    const res = cb(this._value);
    newPromise._state = 'fulfilled';
    newPromise._value = res;
  } catch (err) {
    newPromise._state = 'rejected';
    newPromise._value = err;
  }
  return newPromise;
};
HkcPromise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected);
};
HkcPromise.prototype.finally = function (f) {
  return this.then(
    value => {
      return HkcPromise.resolve(f).then(() => {
        return value;
      });
    },
    err => {
      return HkcPromise.resolve(f).then(() => {
        throw err;
      });
    }
  );
};
HkcPromise.prototype.done = function (onFulfilled, onRejected) {
  this.then((onFulfilled, onRejected)).catch(err => {
    setTimeout(() => {
      throw err;
    }, 0);
  });
};

HkcPromise.resolve = function (value) {
  if (value instanceof HkcPromise) return value;
  const newPromise = new HkcPromise(function () {});
  newPromise._state = 'fulfilled';
  newPromise._value = value;
  return newPromise;
};

HkcPromise.reject = function (value) {
  return new HkcPromise((resolve, reject) => {
    reject(value);
  });
};

HkcPromise.all = function (arr) {
  const res = [];
  return new HkcPromise((resolve, reject) => {
    if (!arr.length) return resolve([]);
    let remaining = arr.length;

    const handler = (index, value) => {
      HkcPromise.resolve(value)
        .then(r => {
          res[index] = r;
        })
        .catch(err => {
          reject(err);
          return;
        });
      if (--remaining === 0) {
        resolve(res);
      }
    };
    for (let i = 0; i < arr.length; i++) {
      handler(i, arr[i]);
    }
  });
};

HkcPromise.race = function (arr) {
  return new HkcPromise((resolve, reject) => {
    arr.forEach(p => {
      HkcPromise.resolve(p).then(resolve, reject);
    });
  });
};
