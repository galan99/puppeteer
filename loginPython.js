const puppeteer = require("puppeteer");
const iPhone6 = puppeteer.devices["iPhone 6"];
const exec = require('child_process').exec;
const base64Img = require('base64-img');

/**
 * nodejs调用python脚本，获取验证码位置
 * 环境：python3.10.6 nodejs14.15.4
 * python库：opencv-python
 * 
*/

function findImageOption(url) {
  return new Promise((resolve, reject) => {
    exec(`python code.py ${url}`, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });
}

function downloadImage(data, path, name) {
  return new Promise((resolve, reject) => {
    var filepath = base64Img.imgSync(data, path, name);
    if (filepath) {
      resolve(filepath);
    } else {
      reject(new Error('download image failed'));
    }
  })
}


(async () => {
  console.log("启动浏览器");

  const config = {
    username: "",
    password: "",
  }

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--start-maximized"], // 打开浏览器时，最大化窗口
  });

  console.log("打开页面");
  const page = await browser.newPage();

  // 模拟 iPhone6
  // await page.emulate(iPhone6);

  console.log("登录");
  
  await page.goto("https://passport.jd.com/uc/login?ltype=logout", {
    waitUntil: "networkidle0",
    timeout: 60000,
  });

  const userTabBtn = await page.$(".login-form .login-tab-r");
  userTabBtn.click();

  await page.evaluate((data) => {
    document.querySelector("#loginname").value = data.username;
  }, config);

  await page.waitForTimeout(1000)
  await page.type("#nloginpwd", config.password, { delay: 20 });


  const loginButton = await page.$("#formlogin .login-btn");
  loginButton.click()
  await page.waitForTimeout(1000)

  let tryTimes = 0;
  while (++tryTimes < 20 && await page.$(".JDJRV-bigimg")) {
    console.log(`正在尝试通过验证码（第${tryTimes}次）`)
    const img = await page.$('.JDJRV-bigimg > img');
    const data = await page.evaluate(img => img.src, img);
    const width = await page.evaluate(element => parseInt(window.getComputedStyle(element).width), img);
    const naturalWidth = await page.evaluate(element => element.naturalWidth, img);

    // 下载图片到本地
    const example_image = await downloadImage(data, './img/', "test");

    // 调用python脚本，获取验证码位置
    const res = await findImageOption(example_image);

    // 获取缺口左x坐标
    const distance = parseInt(res * width / naturalWidth);
    console.log("获取缺口左x坐标", res, distance)

    // debug 用：在页面上展示找到的位置
    await page.evaluate(distance => {
      var mark = document.createElement('div')
      mark.style.height = '10px'
      mark.style.width = '10px'
      mark.style.position = 'absolute'
      mark.style.left = distance + 'px'
      mark.style.top = '0px'
      mark.style.backgroundColor = 'green'
      document.querySelector('.JDJRV-bigimg').appendChild(mark)
    }, distance)
    await page.waitForTimeout(2000)


    // 滑块
    const dragBtn = await page.$('.JDJRV-slide-btn')
    const dragBtnPosition = await page.evaluate(element => {
      // 此处有 bug，无法直接返回 getBoundingClientRect()
      const {x, y, width, height} = element.getBoundingClientRect()
      return {x, y, width, height}
    }, dragBtn)
    // 按下位置设置在滑块中心
    const x = dragBtnPosition.x + dragBtnPosition.width / 2
    const y = dragBtnPosition.y + dragBtnPosition.height / 2

    if (distance > 10) {
      // 如果距离够长，则将距离设置为二段（模拟人工操作）
      const distance1 = distance - 10
      const distance2 = 10
      await page.mouse.move(x, y)
      await page.mouse.down()
      // 第一次滑动
      await page.mouse.move(x + distance1, y, {steps: 30})
      await page.waitForTimeout(500)
      // 第二次滑动
      await page.mouse.move(x + distance1 + distance2, y, {steps: 20})
      await page.waitForTimeout(500)
      await page.mouse.up()
    } else {
      // 否则直接滑到相应位置
      await page.mouse.move(x, y)
      await page.mouse.down()
      await page.mouse.move(x + distance, y, {steps: 30})
      await page.mouse.up()
    }
    // 等待验证结果
    await page.waitForTimeout(3000)
  }

  page.waitForNavigation()
  console.log("admin 登录成功");


  // await Promise.all([
  //   loginButton.click(),
  //   page.waitForNavigation()
  // ]);

  // await page.close();
  // await browser.close();
})();
