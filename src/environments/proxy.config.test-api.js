module.exports = {
  "/i2ecws": {
    target: "http://ncias-q1990-v:38080/",
    secure: false,
    changeOrigin: true,
    onProxyRes: (proxyRes) => {
      let key = "www-authenticate";
      proxyRes.headers[key] =
        proxyRes.headers[key] && proxyRes.headers[key].split(",");
    },
  },
};
