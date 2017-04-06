/**
 * 스크립트의 진입점
 *
 */

const argv = require('./argv');
const path = require('path');
const config = require('./config.task');
const winston = require('winston');
winston.configure({
  transports: [
    new winston.transports.Console({
      prettyPrint: true,
      timestamp: true
    })
  ],
  level: argv.loglevel
});

require('dotenv').load({ path: path.join(__dirname, '.env')});
['FITBIT_CLIENT_ID', 'FITBIT_PRIVATE']
  .forEach(name => {
    if (process.env[name] === undefined) throw new Error(`${name} is not defined`);
  });

const moment = require('moment');
const FitbitToken = require('./lib/token');
const Requestor = require('./lib/requestor');
const Task = require('./lib/task.js');

// 불러온 토큰을 이용하여 새로운 토큰을 생성함
function create(token, taskConfig) {
  const names = Object.keys(taskConfig);
  const tasks = names.map(taskName => new Task(moment(argv.from), taskConfig[taskName]));

  return Promise.all(tasks).then(tasks => new Requestor(tasks, token));
}

FitbitToken.load('3DKZH7.json').then(token => {
  return create(token, config).then(requestor => requestor.start());
}).catch(err => winston.error(err));