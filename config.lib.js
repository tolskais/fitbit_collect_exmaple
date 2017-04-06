const fs = require('fs');

const save = {
  saveSeqFile(task, userid, data) {
    if (data.length === 0) return Promise.resolve();

    return new Promise((f, r) => {
      //Assume timestamp, value, pat_id
      const columns = Object.keys(data[0]);

      const outstr = data.map(row => {
        const rowstr = columns.map(column => row[column]).join(',');

        return userid + ',' + rowstr;
      }).join('\n');

      const output = `${userid}_${task.name}_${task.nextDate.format('YYYY-MM-DD')}.csv`;
      fs.writeFile(output, outstr, err => err ? r(err) : f(err));
    });
  }
};

const extractor = {
  sequence(name) {
    const key = `activities-${name}-intraday`;
    return (data) => {
      if (data[key] === undefined) return null;

      data = data[key].dataset;
      if (data.length === 0) return null;

      return data;
    };
  }
};

const url = {
  sequence(type, detail) {
    const params = [type, 'date', null, '1d', detail + '.json'];
    const dateIndex = 2;

    return (date) => {
      params[dateIndex] = date.format('YYYY-MM-DD');
      return params;
    };
  }
};

function _ignoreZero(row) {
  return row.value !== 0;
}

const filter = {
  ignoreZeroSequence(data) {
    return data.filter(_ignoreZero);
  },
  nop(data) { return data; }
};

const acc = {
  nop(data) {
    return data;
  },
  avg_hour(data, task) {
    const date = task.nextDate.format('YYYY-MM-DD');
    const groups = groupByHour(data);

    return Object.keys(groups).map(hour => {
      const group = groups[hour];
      hour = ('00' + hour).substr(-2);

      return {
        value: group.reduce(_sum, 0) / group.length,
        timestamp: `${date} ${hour}:00:00`
      };
    });
  },
  acc_hour(data, task) {
    const date = task.nextDate.format('YYYY-MM-DD');
    const groups = groupByHour(data);

    return Object.keys(groups).map(hour => {
      const group = groups[hour];
      hour = ('00' + hour).substr(-2);
      return {
        value: group.reduce(_sum, 0),
        timestamp: `${date} ${hour}:00:00`
      };
    });
  },
  raw_data(data, task) {
    const date = task.nextDate.format('YYYY-MM-DD');

    return data.map(row => {
      let value = parseFloat(row.value);
      let timestamp = `${date} ${row.time}`;

      return { timestamp, value };
    });
  }
};

function groupByHour(data) {
  return data.reduce((acc, cur) => {
    const time = cur.time.split(':');
    const hour = +time[0];
    const value = parseFloat(cur.value);

    const arr = acc[hour];
    if (arr) arr.push(value);
    else acc[hour] = [value];

    return acc;
  }, {});
}

function _sum(acc, x) {
  return acc + x;
}

module.exports = { acc, extractor, url, save, filter };
