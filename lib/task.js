const moment = require('moment');
const winston = require('winston');
const { until } = require('../argv.js');

function setProperty(opts, enumerable, ...names) {
  names.forEach(name => {
    const value = opts[name];
    if (value === undefined) throw new Error(`Could not create a task: ${name} is undefined`);
    Object.defineProperty(this, name, { value, enumerable });
  });
}

class Task {
  constructor(startDate, opts) {
    this.nextDate = moment(startDate).hour(0).minute(0).seconds(0).milliseconds(0);

    const set = setProperty.bind(this, opts);
    set(true, 'name');
    set(false, 'url', 'extractor', 'acc', 'saveTo', 'filter');

    if (until !== null) Object.defineProperty(this, 'until', { value: until });
    else Object.defineProperty(this, 'until', { get: () => moment() });
  }

  prepareNext() {
    this.nextDate.add(1, 'days');
  }

  save(userid, data) {
    return this.saveTo(this, userid, data);
  }

  urlParams() {
    return this.url(this.nextDate);
  }

  extract(data) {
    data = this.extractor(data, this);
    if (data === null) return null;

    const ret = this.acc(this.filter(data), this);

    return ret;
  }

  hasNext() {
    const diff = moment.duration(this.until.diff(this.nextDate));
    if (diff.asHours() < 24) {
      winston.warn('Requested date may do not have complete daily data');
    }
    return this.until.isAfter(this.nextDate, 'hour');
  }
}

module.exports = Task;
