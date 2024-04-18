/*
 * Don't mess with this. It's for Doug. Make your own! :)
 */

module.exports = {
    '/i2earaws': {
    // target: 'http://localhost:8081',
    target: 'http://ncias-d3203-v:16080/',
    // target: 'http://ncias-q1990-v:16080/',
    secure: false,
    changeOrigin: true,
    onProxyRes: proxyRes => {
      let key = 'www-authenticate';
      proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',');
    }
  },
  '/i2ecommonws': {
    // target: 'http://localhost:8080/',
    target: 'http://ncias-d3203-v:14080/',
    // target: 'http://ncias-q1990-v:14080/',
    secure: false,
    changeOrigin: true,
    onProxyRes: proxyRes => {
      let key = 'www-authenticate';
      proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',');
    }
  },
  '/i2eemws': {
    // target: 'http://localhost:8082/',
    target: 'http://ncias-d3203-v:8080/',
    // target: 'http://ncias-q1990-v:8080/',
    secure: false,
    changeOrigin: true,
    onProxyRes: proxyRes => {
      let key = 'www-authenticate';
      proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',');
    }
  },
  '/i2efsws': {
    target: 'http://localhost:8083/',
    // target: 'http://ncias-d3203-v:9080/',
    // target: 'http://ncias-q1990-v:9080/',
    secure: false,
    changeOrigin: true,
    onProxyRes: proxyRes => {
      let key = 'www-authenticate';
      proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',');
    }
  },
  '/i2erefws': {
    // target: 'http://localhost:8085/',
    target: 'http://ncias-d3203-v:13080/',
    // target: 'http://ncias-q1990-v:13080/',
    secure: false,
    changeOrigin: true,
    onProxyRes: proxyRes => {
      let key = 'www-authenticate';
      proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',');
    }
  },
  '/i2ejasperws': {
    // target: 'http://localhost:8084/',
    target: 'http://ncias-d3203-v:15080/',
    // target: 'http://ncias-q1990-v:15080/',
    secure: false,
    changeOrigin: true,
    onProxyRes: proxyRes => {
      let key = 'www-authenticate';
      proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',');
    }
  },
  '/i2eygws': {
    // target: 'http://localhost:8087/',
    target: 'http://ncias-d3203-v:10080/',
    // target: 'http://ncias-q1990-v:10080/',
    secure: false,
    changeOrigin: true,
    onProxyRes: proxyRes => {
      let key = 'www-authenticate';
      proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',');
    }
  },
  '/i2emailsvc': {
    // target: 'http://localhost:8888/',
    target: 'http://ncias-d3203-v:28080/',
    // target: 'http://ncias-q1990-v:28080/',
    secure: false,
    changeOrigin: true,
    onProxyRes: proxyRes => {
      let key = 'www-authenticate';
      proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',');
    }
  },
  '/i2eicdws': {
    // target: 'http://localhost:8088/',
    target: 'http://ncias-d3203-v:11080/',
    // target: 'http://ncias-q1990-v:11080/',
    secure: false,
    changeOrigin: true,
    onProxyRes: proxyRes => {
      let key = 'www-authenticate';
      proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',');
    }
  }
};
