const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

/**
 * 截图功能说明
 * https://www.bannerbear.com/blog/how-to-take-screenshots-with-puppeteer/
 * **/

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

// 因为文章图片引入了懒加载，所以需要把页面滑动到最底部，保证所有图片都加载出来
function autoScroll(page) {
  return page.evaluate(() => {
    return new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      // 每200毫秒让页面下滑100像素的距离
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}

(async () => {
  const config = {
    output: "images/",
  };

  const browser = await puppeteer.launch({
    headless: false,
    args: ["--start-maximized"], // 打开浏览器时，最大化窗口
    // devtools: true,
    defaultViewport: {
      width: 1920,
      height: 1080,
    },
  });
  let page = await browser.newPage();
  const url = "https://www.testim.io/blog/puppeteer-screenshot/";
  console.log("加载首页");
  await page.goto(url, {
    timeout: 60000,
    waitUntil: "networkidle0", // networkidle0 会一直等待，直到页面加载后不存在 0 个以上的资源请求，这种状态持续至少 500 ms
  });

  await autoScroll(page);

  const outputPath = resolve(config.output);
  const isExists = fs.existsSync(outputPath);

  console.log("isExists", isExists, "outputPath", outputPath);

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

  const output = resolve(`${config.output}index.png`);

  await page.screenshot({
    path: output,
    fullPage: true,
  });

  console.log("截图成功");

  await page.close();
  await browser.close();
})();
