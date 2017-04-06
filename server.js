require('dotenv').load();
const express = require('express');
const bodyParser = require('body-parser');
const request = require('superagent');
const fs = require('fs');

const server = express();

["IP", "PORT", "FITBIT_CLIENT_ID"].forEach(name => {
  if (process.env[name] === undefined) throw new Error(`${name} is not defined`);
});

const FITBIT_REDIRECT = `http://${process.env.IP}:${process.env.PORT}/fitbit`;

server.use(bodyParser.urlencoded({
  extended : true,
  limit: '50mb'
}));

server.route('/').get((req, res) => {
  const params = {
    'response_type': 'code',
    'client_id': process.env.FITBIT_CLIENT_ID,
    'redirect_uri': FITBIT_REDIRECT,
    'scope': 'activity heartrate sleep',
    'prompt': 'login'
  };

  let query = [];
  for(let key in params) {
    if (params[key]) {
      query.push(key + '=' + encodeURIComponent(params[key]));
    }
  }

  res.redirect('https://www.fitbit.com/oauth2/authorize?' + query.join('&'));
});

server.route('/fitbit').get((req, res, next) => {
  authorize(req.query.code).then(token => {
    return new Promise((f, r) => {
      fs.writeFile(token.user_id + '.json', JSON.stringify(token), (e) => {
        if (e) return r(e);
        f();
      });
    });
  }).then(() => res.end(), next);
});

const auth_header = 'Basic ' + new Buffer(process.env.FITBIT_CLIENT_ID + ':' + process.env.FITBIT_PRIVATE).toString('base64');
function authorize(code) {
  return new Promise((fulfill, reject) => {
    let params = {
      code: code,
      grant_type: 'authorization_code',
      client_id: process.env.FITBIT_CLIENT_ID,
      redirect_uri: FITBIT_REDIRECT
    };

    let r = request.post('https://api.fitbit.com/oauth2/token').set('Authorization', auth_header);

    //Send using object return "Bad Request", so send parameters as a string
    for (let key in params) r = r.send(`${key}=${params[key]}`);

    r.end((e, r) => {
      let body = r.body;
      if (e) return reject(e);
      if (body.errors) return reject(body.errors);

      fulfill(body);
    });
  });
}

server.listen(process.env.PORT,process.env.IP);