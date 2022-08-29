const puppeteer = require("puppeteer");
const iPhone6 = puppeteer.devices["iPhone 6"];
const {createCanvas, Image} = require("canvas");

/**
 * 掘金教程：https://juejin.cn/post/7028404512259833869
*/

/**
 * combine rgba colors [r, g, b, a]
 * @param rgba1 底色
 * @param rgba2 遮罩色
 * @returns {number[]}
 */
function combineRgba (rgba1, rgba2) {
  const [r1, g1, b1, a1] = rgba1
  const [r2, g2, b2, a2] = rgba2
  const a = a1 + a2 - a1 * a2
  const r = (r1 * a1 + r2 * a2 - r1 * a1 * a2) / a
  const g = (g1 * a1 + g2 * a2 - g1 * a1 * a2) / a
  const b = (b1 * a1 + b2 * a2 - b1 * a1 * a2) / a
  return [r, g, b, a]
}

//console.log(combineRgba([255, 255, 255, 1], [0, 0, 0, 0.65]))
/**
 * 判断两个颜色是否相似
 * @param rgba1
 * @param rgba2
 * @param t
 * @returns {boolean}
 */
function tolerance (rgba1, rgba2, t){
  const [r1, g1, b1] = rgba1
  const [r2, g2, b2] = rgba2
  return (
    r1 > r2 - t && r1 < r2 + t
    && g1 > g2 - t && g1 < g2 + t
    && b1 > b2 - t && b1 < b2 + t
  )
}

function getVerifyPosition(base64, actualWidth) {
  return new Promise((resolve, reject) => {
    const canvas = createCanvas(1000, 1000);
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      const maskRgba = [0, 0, 0, 0.65];
      const t = 10; // 色差容忍值
      let prevPixelRgba = null;
      for (let x = 0; x < width; x++) {
        // 重新开始一列，清除上个像素的色值
        prevPixelRgba = null;
        for (let y = 0; y < height; y++) {
          const rgba = ctx.getImageData(x, y, 1, 1).data;
          if (prevPixelRgba) {
            // 所有原图中的 alpha 通道值都是1
            prevPixelRgba[3] = 1;
            const maskedPrevPixel = combineRgba(prevPixelRgba, maskRgba);
            // 只要找到了一个色值匹配的像素点则直接返回，因为是自上而下，自左往右的查找，第一个像素点已经满足"最近"的条件
            if (tolerance(maskedPrevPixel, rgba, t)) {
              resolve((x * actualWidth) / width);
              return;
            }
          } else {
            prevPixelRgba = rgba;
          }
        }
      }
      // 没有找到任何符合条件的像素点
      resolve(0);
    };
    img.onerror = reject;
    img.src = base64;
  });
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

  await page.goto("https://passport.jd.com/uc/login?ltype=logout", {
    waitUntil: "networkidle0",
    timeout: 60000,
  });

  const userTabBtn = await page.$(".login-form .login-tab-r");
  userTabBtn.click();

  await page.evaluate(() => {
    document.querySelector("#loginname").value = config.username;
  });

  await page.waitForTimeout(1000)
  await page.type("#nloginpwd", config.password, { delay: 20 });


  const loginButton = await page.$("#formlogin .login-btn");
  loginButton.click()
  await page.waitForTimeout(1000)

  let tryTimes = 0;
  while (++tryTimes < 20 && await page.$(".JDJRV-bigimg")) {
    console.log(`正在尝试通过验证码（第${tryTimes}次）`)
    const img = await page.$('.JDJRV-bigimg > img')
    // 获取缺口左x坐标
    const distance = await getVerifyPosition(
      await page.evaluate(element => element.getAttribute('src'), img),
      await page.evaluate(element => parseInt(window.getComputedStyle(element).width), img)
    );

    // debug 用：在页面上展示找到的位置
    // await page.evaluate(distance => {
    //   var mark = document.createElement('div')
    //   mark.style.height = '10px'
    //   mark.style.width = '10px'
    //   mark.style.position = 'absolute'
    //   mark.style.left = distance + 'px'
    //   mark.style.top = '0px'
    //   mark.style.backgroundColor = 'green'
    //   document.querySelector('.JDJRV-bigimg').appendChild(mark)
    // }, distance)
    // await page.waitForTimeout(2000)


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
