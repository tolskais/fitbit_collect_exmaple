const agent = require('superagent');
const winston = require('winston');
const oauth = require('./oauth');
const timer = require('timers');
const debug = require('debug')('bs:FitbitRequestor');
const throttle = require('./agent-throttle.js');
const moment = require('moment');

const MAX_RETRY_COUNT = 3;
const REQ_LIMIT = 120;
const REQ_BUFFER = 10;
const REQ_PER_HOUR = REQ_LIMIT - REQ_BUFFER;

class Requestor {
  constructor(tasks, token) {
    Object.defineProperties(this, {
      '_token': { value: token },
      '_tasks': { value: tasks }
    });

    Object.defineProperty(this, '_requestErrorHandler', {
      value: oauth.createErrorHandler({
        [oauth.errorTypes.ERR_ACCESS_TOKEN_EXPIRED]: (err) => {
          return this._token.refresh().then(() => this._request());
        },
        [oauth.errorTypes.ERR_ACCESS_TOKEN_INVALID]: (err) => {
          this.error('invalid access token');
          throw err;
        },
        [oauth.errorTypes.ERR_NETWORK]: () => {
          if (++this._error_count === MAX_RETRY_COUNT) {
            this.error('too many error');
            throw new Error();
          }

          return this._request();
        },
        [oauth.errorTypes.ERR_TOO_MANY_REQUEST]: (err, res) => {
          this.debug('fitbit returns (too many requests)');

          let time = parseInt(res.headers['retry-after']);
          if (isNaN(time)) time = 0;

          return this._delay(time);
        },
        default: (err) => { this.debug('Unknown error'); throw err; }
      })
    });

    this._error_count = 0;
    this._limitCount = REQ_PER_HOUR;
    this._nextTask();
  }

  error(format, ...args) {
    winston.error(`%s: ${format}`, this._token.user_id, ...args);
  }

  debug(format, ...args) {
    debug(`%s: ${format}`, this._token.user_id, ...args);
  }

  getNextDate() {
    return moment(this._tasks.reduce((prev, cur) => {
      const lastDate = cur.lastDoneDate;
      if (lastDate.isSameOrBefore(prev, 'day')) return lastDate;
      else return prev;
    }, moment().hour(0).minute(0).second(0).millisecond(0)));
  }

  start() {
    this.debug('start: %j', this._tasks);
    return new Promise((fulfill, reject) => {
      this._start().then(() => fulfill(this), reject);
    });
  }

  _start() {
    const p = this._requestNext();
    if (!p) return Promise.resolve();

    const token = this._token;
    const task = this._currentTask;

    return p
    .then(data => {
      if (data !== null && data.length > 0) {
        this.debug('save data');
        return task.save(token.pat_id, data);
      } else {
        this.debug('no data found');
      }
    })
    .then(() => {
      this.debug('start next');
      const task = this._currentTask;
      task.prepareNext();
      return this._start();
    });
  }

  _requestNext() {
    const task = this._currentTask;

    if (!task.hasNext()) {
      if (this._nextTask()) {
        return this._requestNext();
      }
      else return null;
    }

    return this._request();
  }

  _nextTask() {
    if (this._taskIndex === undefined) this._taskIndex = 0;
    else if (++this._taskIndex >= this._tasks.length) {
      this.debug('All tasks are finished');
      return false;
    }

    this._currentTask = this._tasks[this._taskIndex];
    this.debug('Load next task');

    return true;
  }

  _request() {
    const task = this._currentTask;
    const token = this._token;
    const url = urlresolve([].concat(token.urlParams(), task.urlParams()));

    if (--this._limitCount < 0) {
      this._limitCount = REQ_PER_HOUR;
      return this._delay((60 - new Date().getMinutes() + 10) * 60);
    }

    this.debug(url);
    return agent.get(url)
    .use(throttle.plugin())
    .set(token.requestHeaders)
    .then(res => {
      const remain = parseInt(res.headers['fitbit-rate-limit-remaining']);
      if (this._limitCount >= remain) {
        this._limitCount = remain - REQ_BUFFER;
        this.debug('Update limitCount to %d', this._limitCount);
      }

      return task.extract(res.body);
    }, this._requestErrorHandler);
  }

  _delay(time) {
    if (time === 0) {
      this.debug('request next immediately');
      return this._request();
    }

    this.debug('Delay next request: %d', time);

    return new Promise((f) => {
      timer.setTimeout(f, time * 1000);
    }).then(() => this._request());
  }
}

function urlresolve(arr) {
  return arr.join('/')
          .replace(/[\/]+/g, '/')
          .replace(/\/\?/g, '?')
          .replace(/\/\#/g, '#')
          .replace(/\:\//g, '://');
}

module.exports = Requestor;
