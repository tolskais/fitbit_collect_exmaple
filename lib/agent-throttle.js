const Throttle = require('superagent-throttle');

const opt = new Throttle({
  active: true,     // set false to pause queue
  rate: 10,          // how many requests can be sent every `ratePer`
  ratePer: 1000,   // number of ms in which `rate` requests may be sent
  concurrent: 1     // how many requests can be sent concurrently
});

module.exports = opt;
