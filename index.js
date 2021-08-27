const http = require("http"),
  tls = require("tls");
const https = require("https");
const HttpsProxyAgent = require("https-proxy-agent");
const { parseJson } = require("./utils");

const proxyRequest = ({ url, proxy, method = `GET` } = {}) => {
  if (!(url && proxy)) {
    throw new Error(
      `[ERROR] Proxy request; Both url and proxy props are required`
    );
  }

  const { host: urlHost, pathname, search } = new URL(url);
  const {
    proxy: { auth, host: proxyHost, port: proxyPort },
  } = new HttpsProxyAgent(proxy);

  if (!auth) {
    throw new Error(`[ERROR] Proxy request; Invalid proxy credentials`);
  }
  const encodedAuth = "Basic " + Buffer.from(auth).toString("base64");

  return new Promise((resolve) => {
    const req = http
      .request({
        host: proxyHost,
        port: proxyPort,
        method: "CONNECT",
        path: `${urlHost}:443`,
        headers: {
          "Proxy-Authorization": encodedAuth,
        },
      })
      .on("connect", (res, socket, head) => {
        const tlsConnection = tls.connect(
          {
            host: urlHost,
            socket: socket,
          },
          () =>
            tlsConnection.write(`GET / HTTP/1.1\r\nHost: ${urlHost}\r\n\r\n`)
        );

        tlsConnection.on("data", (data) => {
          const req = https.request(
            {
              host: urlHost,
              port: 443,
              path: `${pathname}${search}`,
              method: method.toUpperCase(),
            },
            (res) => {
              res.on("data", (d) => {
                resolve(parseJson(d));
              });
            }
          );

          req.on("error", (e) => {
            console.error(
              `[ERROR] Proxy request; HTTPS request error: url - ${url}, proxy - ${proxy}`,
              e
            );
          });
          req.end();
        });

        tlsConnection.on("error", (error) => {
          console.error(`[ERROR] Proxy request; TLS connection error:`, error);
        });
      });

    req.on("error", (err) =>
      console.error(`[ERROR] Proxy request; HTTP request error:`, err)
    );

    req.end();
  });
};

module.exports = proxyRequest;
