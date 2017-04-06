/*eslint-disable no-unused-vars */

const lib = require('./config.lib.js');

module.exports = {
  heartrate: {
    name: 'heartrate',
    url: lib.url.sequence('activities/heart', '1min'),
    extractor: lib.extractor.sequence('heart'),
    acc: lib.acc.avg_hour,
    saveTo: lib.save.saveSeqFile,
    filter: lib.filter.ignoreZeroSequence,
  },
  steps: {
    name: 'steps',
    url: lib.url.sequence('activities/steps', '15min'),
    extractor: lib.extractor.sequence('steps'),
    acc: lib.acc.acc_hour,
    saveTo: lib.save.saveSeqFile,
    filter: lib.filter.nop
  }
};
