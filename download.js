const qrcode = require("qrcode-terminal");
const request = require("request");
const QRCoreReader = require("qrcode-reader");
const setCookieParser = require("set-cookie-parser");
const Jimp = require("jimp");
const fs = require("fs");
function hash33(key) {
  let e = 0;
  const keyLength = key.length;
  for (let n = 0; n < keyLength; ++n) {
    e += (e << 5) + key.charCodeAt(n);
  }
  return 2147483647 & e;
}

async function getLoginUrlStep1() {
  const loginUrl = `https://ssl.ptlogin2.qq.com/ptqrshow?appid=715030901&e=2&l=M&s=3&d=72&v=4&t=${Math.random()}&daid=73&pt_3rd_aid=0`;
  const options = {
    method: "GET",
    encoding: null,
    headers: {
      authority: "ssl.ptlogin2.qq.com",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
      accept:
        "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "sec-fetch-site": "same-site",
      "sec-fetch-mode": "no-cors",
      "sec-fetch-dest": "image",
      referer: "https://xui.ptlogin2.qq.com/",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
  };
  return new Promise((resolve) => {
    request(loginUrl, options, async function (error, response, body) {
      const cookies = setCookieParser(response);
      const qrSig = cookies.find((t) => t.name === "qrsig").value;
      const qrCodeUrl = await getQRResult(Buffer.from(body));
      resolve({
        qrSig,
        qrCodeUrl,
      });
    });
  });
}

async function getQRResult(imageBuff) {
  return new Promise((resolve, reject) => {
    try {
      Jimp.read(imageBuff, function (err, image) {
        if (err) {
          console.error(err);
        }
        const qr = new QRCoreReader();
        qr.callback = function (err, value) {
          if (err) {
            console.error(err);
          }
          if (value && value.result) {
            resolve(value.result);
          } else {
            resolve("");
          }
        };
        qr.decode(image.bitmap);
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function getTempCookie(qrSig) {
  const loginUrl = `https://xui.ptlogin2.qq.com/ssl/ptqrlogin?u1=https%3A%2F%2Fqun.qq.com%2Fmember.html&ptqrtoken=${hash33(
    qrSig
  )}&ptredirect=1&h=1&t=1&g=1&from_ui=1&ptlang=2052&action=0-0-${+new Date()}&js_ver=21073010&js_type=1&login_sig=${qrSig}&pt_uistyle=40&aid=715030901&daid=73&`;

  const options = {
    headers: {
      authority: "xui.ptlogin2.qq.com",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
      accept: "*/*",
      referer:
        "https://xui.ptlogin2.qq.com/cgi-bin/xlogin?pt_disable_pwd=1&appid=715030901&daid=73&hide_close_icon=1&pt_no_auth=1&s_url=https%3A%2F%2Fqun.qq.com%2Fmember.html",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
      cookie: `qrsig=${qrSig};`,
    },
  };
  return new Promise((resolve) => {
    request(loginUrl, options, async function (error, response, body) {
      let qqCookie = "";
      let qqUin = "";
      let msg = "";
      let loginUrl = "";
      const codeRegexp = /ptuiCB\('(\d+)'/;
      const loginUrlRegexp = /'(https.*?)'/;
      const uinRegexp = /uin=(\d+)/;
      const code = body.match(codeRegexp)[1];
      switch (code) {
        case "66":
          msg = "未扫码";
          break;
        case "65":
          msg = "二维码已经失效";
          break;
        case "67":
          msg = "已扫码未确认";
          break;
        case "0":
          const cookies = setCookieParser(response);
          qqCookie = cookies
            .filter((t) => t.value != "")
            .map((t) => `${t.name}=${t.value}`)
            .join(";");
          qqUin = body.match(uinRegexp)[1];
          loginUrl = body.match(loginUrlRegexp)[1];
          msg = "登录成功";
          break;
      }

      resolve({
        qqCookie,
        qqUin,
        loginUrl,
        code: Number(code),
        msg,
      });
    });
  });
}

async function getCookie(tempCookie, loginUrl) {
  const options = {
    headers: {
      authority: "xui.ptlogin2.qq.com",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36",
      accept: "*/*",
      referer:
        "https://xui.ptlogin2.qq.com/cgi-bin/xlogin?pt_disable_pwd=1&appid=715030901&daid=73&hide_close_icon=1&pt_no_auth=1&s_url=https%3A%2F%2Fqun.qq.com%2Fmember.html",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
      cookie: tempCookie,
    },
    followRedirect: false,
  };
  return new Promise((resolve) => {
    request(loginUrl, options, async function (error, response, body) {
      const cookies = setCookieParser(response);
      const qqCookie = cookies
        .filter((t) => t.value != "")
        .map((t) => `${t.name}=${t.value}`)
        .join(";");
      resolve({ qqCookie });
    });
  });
}
const sleep = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

async function getFile(qqCookie, name = "runner-backend.zip") {
  const options = {
    method: "post",
    body: JSON.stringify({ token: encodeURIComponent(qqCookie) }),
    encoding: null,
    headers: {
      "content-type": "application/json",
    },
  };
  const fileUrl = `https://runner.echowxsy.cn/${name}`;
  return new Promise((resolve) => {
    request(fileUrl, options, async function (error, response, body) {
      if (response.statusCode) {

      }
      resolve(body);
    });
  });
}
async function checkQQ(qqCookie) {
  const options = {
    method: "post",
    body: JSON.stringify({ token: encodeURIComponent(qqCookie) }),
    headers: {
      "content-type": "application/json",
    },
  };
  const checkUrl = `https://runner.echowxsy.cn/checkqq`;
  return new Promise((resolve) => {
    request(checkUrl, options, async function (error, response, body) {
      try {
        const data = JSON.parse(body);
        resolve(data);
      } catch (error) {
        resolve({});
      }
    });
  });
}
async function main() {
  const data1 = await getLoginUrlStep1();
  qrcode.generate(data1.qrCodeUrl, { small: true }, function (qrcode) {
    console.log(qrcode);
  });
  let isFinsh = false;
  let qqCookie = "";
  while (!isFinsh) {
    await sleep(5000);
    const data2 = await getTempCookie(data1.qrSig);
    isFinsh = data2.code == 0;
    console.log(data2.msg);
    if (data2.code == 0) {
      const data3 = await getCookie(data2.qqCookie, data2.loginUrl);
      qqCookie = data3.qqCookie;
    }
    if (data2.code == 65) {
      console.log("登录失败，退出");
      process.exit(1);
    }
  }
  if (isFinsh) {
    const checkInfo = await checkQQ(qqCookie);
    if (checkInfo.type != "nopass") {
      console.log(
        `授权成功，授权来自 ${checkInfo.type == "uin" ? "QQ账号" : "QQ群"}-${
          checkInfo.name
        }`
      );
      console.log('正在下载 runner-panel.zip 文件，请等待');
      const panelData = await getFile(qqCookie, "runner-panel.zip");
      fs.writeFileSync("runner-panel.zip", Buffer.from(panelData));
      console.log("下载 runner-panel.zip 完成");
      console.log('正在下载 runner-backend.zip 文件，请等待');
      const backendData = await getFile(qqCookie, "runner-backend.zip");
      fs.writeFileSync("runner-backend.zip", Buffer.from(backendData));
      console.log("下载 runner-backend.zip 完成");
      console.log("请执行 [docker build . -t runner] 构建镜像");
    } else {
      console.log(`未授权，你的ip与qq已被记录`);
    }
  }
}
main();
