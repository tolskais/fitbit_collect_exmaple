const winston = require('winston');

function defineError(obj, name) {
  Object.defineProperty(errorTypes, name, { value: name, enumerable: true });
}

const errorTable = {
  400: {
    'invalid_grant': 'ERR_REFRESH_TOKEN_INVALID',
  },
  401: {
    'expired_token': 'ERR_ACCESS_TOKEN_EXPIRED',
    'invalid_token': 'ERR_ACCESS_TOKEN_INVALID',
  },
  429: {
    '*': 'ERR_TOO_MANY_REQUEST'
  }
};

const errorTypes = {};
for (let statusCode in errorTable) {
  const statusTable = errorTable[statusCode];
  for (let errType in statusTable) {
    const type = statusTable[errType];
    defineError(errorTypes, type);
  }
}

defineError(errorTypes, 'ERR_NETWORK');
defineError(errorTypes, 'ERR_UNKNOWN_RESPONSE');


function createErrorHandler(rules) {
  for (let key in rules) {
    if (!errorTypes[key] && key !== 'default') throw new Error('Invalid errorType: ' + key);
  }
  if (!rules.default) throw new Error('No default error handle defined.');

  const table = {};
  for (let type in errorTypes) {
    if (rules[type]) table[type] = rules[type];
    else table[type] = rules.default;
  }

  return handleError.bind(table);
}

function handleError(err) {
  const statusCode = err.status;
  if (!this) throw new Error('Invalid handleError');
  if (!statusCode) {
    winston.warn('NetworkError: %j', err);
    return this.ERR_NETWORK();
  }
  if (statusCode === 429) return this.ERR_TOO_MANY_REQUEST(null, err.response);

  const result = err.response.body;
  const errors = result.errors;
  if (!errors) return this.ERR_UNKNOWN_RESPONSE(result);

  if (errors.length > 1) winston.warn('Multiple error returns: %j. Use first error information', result);

  let statusTable = errorTable[statusCode];
  if (!statusTable) {
    winston.warn('Unknown http statusCode: %d, %j', statusCode, result);
    return this.ERR_UNKNOWN_RESPONSE(result);
  }

  const json = result.errors[0];
  let type = statusTable[json.errorType] || errorTable[0][json.errorType];
  if (!type) {
    winston.warn('Unknown Error: %d, %s', statusCode, JSON.stringify(json));
    return this.ERR_UNKNOWN_RESPONSE(result);
  }

  return this[type](result, err.response);
}

const { FITBIT_CLIENT_ID, FITBIT_PRIVATE } = process.env;
module.exports = {
  errorTypes,
  createErrorHandler,
};

let refresh_url = 'https://api.fitbit.com/oauth2/token';
let api_url = 'https://api.fitbit.com/1/user';
Object.defineProperty(module.exports, 'refresh_header', { value: { Authorization: 'Basic ' + new Buffer(FITBIT_CLIENT_ID + ':' + FITBIT_PRIVATE).toString('base64') } });
Object.defineProperty(module.exports, 'refresh_url', { set: (value) => refresh_url = value, get: () => refresh_url });
Object.defineProperty(module.exports, 'api_url', { set: (value) => api_url = value, get: () => api_url });
