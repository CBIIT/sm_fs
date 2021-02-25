module.exports = {
  '/i2ecws': {
    target: 'http://localhost:8080/',
    secure: false,
    changeOrigin: true,
    onProxyRes: proxyRes => {
      let key = 'www-authenticate';
      proxyRes.headers[key] = proxyRes.headers[key] && proxyRes.headers[key].split(',');
    }
  }
};
