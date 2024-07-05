module.exports = {
  '/i2ecommonws': {
    target: 'http://ncias-q3252-v:14080/',
    secure: false,
    changeOrigin: true,
    onProxyRes: proxyRes => {
      let key = 'www-authenticate';
      proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',');
    }
  },
  '/i2efsws': {
    target: 'http://ncias-q3252-v:9080/',
    secure: false,
    changeOrigin: true,
    onProxyRes: proxyRes => {
      let key = 'www-authenticate';
      proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',');
    }
  },
  '/i2ejasperws': {
    target: 'http://ncias-q3252-v:15080/',
    secure: false,
    changeOrigin: true,
    onProxyRes: proxyRes => {
      let key = 'www-authenticate';
      proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',');
    }
  },
  '/i2erefws': {
    target: 'http://ncias-q3252-v:13080/',
    secure: false,
    changeOrigin: true,
    onProxyRes: proxyRes => {
      let key = 'www-authenticate';
      proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',');
    }
  },
  '/i2eygws': {
    target: 'http://ncias-q3252-v:10080/',
    secure: false,
    changeOrigin: true,
    onProxyRes: proxyRes => {
      let key = 'www-authenticate';
      proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',');
    }
  },
  '/i2emailsvc': {
    target: 'http://ncias-q3252-v:28080/',
    secure: false,
    changeOrigin: true,
    onProxyRes: proxyRes => {
      let key = 'www-authenticate';
      proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',');
    }
  }
};
