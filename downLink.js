const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");

// 创建文件夹
function mkdirOutputpath(outputPath) {
  try {
    fs.mkdirSync(outputPath);
    console.log("mkdir is successful!");
  } catch (e) {
    console.log("mkdir is failed!", e);
  }
}

// 获取目录地址
function resolve(dir, dir2 = ''){
	return path.posix.join(__dirname, './', dir, dir2);
}

function downloadFile (url, filePath) {
  return axios({
    method: "get",
    url: url,
    responseType: "stream",
  }).then((response) => {
    response.data.pipe(fs.createWriteStream(filePath));
  });
};

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto("https://www.tdx.com.cn/products/user_redbook_style2.asp", {
    waitUntil: "networkidle0",
    timeout: 60000,
  });
  
  console.log("加载首页");
  // await page.waitForTimeout(1000)

  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a"));
    return anchors.map((anchor) => anchor.href).filter((href) => href.includes("userdoc"));
  });

  // console.log("links", links);

  const output = "download";
  const outputPath = resolve(output);
  const isExists = fs.existsSync(outputPath);

  // 如果不存在 则创建
  if (!isExists) {
    mkdirOutputpath(outputPath);
  } else {
    // 存在，则删除该目录下的文件重新生成
    // rm(outputPath, (err) => {
    //   if (err) throw err;
    //   console.log("删除文件夹成功");
    //   mkdirOutputpath(outputPath);
    // });
  }

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const name = decodeURIComponent(link).split("/").pop();
    await downloadFile(link, resolve(output, name));
  }

  console.log("下载完成");


  await page.close();
  await browser.close();
})();