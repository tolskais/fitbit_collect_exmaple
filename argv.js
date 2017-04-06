const moment    = require('moment');
const argv      = require('minimist')(process.argv.slice(2), {
  string: ['loglevel', 'category', 'from','until'],
  default: {
    from: null,
    until: null,
    category: 'all',
    loglevel: 'info'
  }
});

argv.from = moment(argv.from);
argv.until = moment(argv.until).add(1, 'days');

if (argv.category === 'all') {
  argv.category = ['steps', 'heartrate'];
} else {
  argv.category = argv.category.split(',');
  if (!argv.category.every(x => x === 'steps' || x === 'heartrate')) throw new Error('invalid category parameter');
}

module.exports = argv;
