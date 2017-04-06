const winston = require('winston');
const agent = require('superagent');
const logger = require('winston');
const oauth = require('./oauth');
const throttle = require('./agent-throttle.js');
const debug = require('debug')('bs:FitbitToken');
const fs = require('fs');

class FitbitToken {
  constructor(file, obj) {
    Object.assign(this, obj); //refresh_token, access_token, user_id

    this.token = obj;

    Object.defineProperties(this, {
      tokenpath: { get() { return file; }},
      requestHeaders: { get() { return { 'Authorization': 'Bearer ' + this.access_token }; }},
      '_handleRefreshError': { value:
        oauth.createErrorHandler({
          [oauth.errorTypes.ERR_REFRESH_TOKEN_INVALID]: (err) => {
            logger.error('Refresh failed.', this);
            return this.reset(err);
          },
          default: (err) => {
            logger.error('Unknown error during refresh', this);
            throw err;
          }
        })
      }
    });
  }

  urlParams() {
    return [oauth.api_url, this.user_id];
  }

  _updateTokenFile(obj) {
    return new Promise((f, r) => {
      fs.writeFile(this.tokenpath, JSON.stringify(this.token), (e) => {
        if (e) r(e);
        f();
      });
    });
  }

  _handleRefresh(res) {
    const { body } = res;
    if (body.errors) return logger.error('Invalid body from refresh process.', this);

    this.token = body;

    return this._updateTokenFile(this.token)
      .then(() => logger.info('Refresh completed', this))
      .catch(err => {
        logger.error('Receive new token, but could not update', this);
        return this.reset()
          .then(() => {
            logger.warn('FitbitToken is resetted', this);
            throw new Error(err); // 토큰 리셋 성공 후 문제가 되었던 에러는 그대로 넘김
          }, () => {
            logger.warn('FitbitToken is invalid but could not resetted.', this);
            throw new Error(err); // 토큰 리셋 실패 중 발생한 문제는 무시하고 원래 refresh중 발생한 에러를 바로 넘김
          });
      });
  }

  /**
    oauth token의 유효기간이 지났을 경우 새로운 access token을 요청함. 실패할 경우에는 데이터베이스에 저장한 토큰을 삭제

    @method refresh
  */
  refresh() {
    logger.info('refresh token', this);

    return agent.post(oauth.refresh_url)
    .use(throttle.plugin())
    .type('form')
    .set(oauth.refresh_header)
    .send({
      grant_type: 'refresh_token',
      refresh_token: this.refresh_token
    })
    .then((res) => this._handleRefresh(res), this._handleRefreshError);
  }

  reset(err) {
    return Promise.resolve(err);
  }
}

FitbitToken.load = function (file) {
  return new Promise((f, r) => {
    fs.readFile(file, (err, data) => {
      if (err) return r(err);

      try {
        f(new FitbitToken(file, JSON.parse(data)));
      } catch(e) {
        r(e);
      }
    });
  });
};

module.exports = FitbitToken;
