const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const rm = require("rimraf");

function resolve(dir, dir2 = "") {
  return path.posix.join(__dirname, "./", dir, dir2);
}

function $el(selector) {
  return document.querySelector(selector);
}

function $els(selector) {
  return document.querySelectorAll(selector);
}

function mkdirOutputpath(outputPath) {
  try {
    fs.mkdirSync(outputPath);
    console.log("mkdir is successful!");
  } catch (e) {
    console.log("mkdir is failed!", e);
  }
}

(async () => {
  const browser = await puppeteer.launch({
    // headless: false, pdf功能不能打开浏览器，所以不能使用headless: false
    // args: ['--start-maximized'], // 打开浏览器时，最大化窗口
    // devtools: true,
    // defaultViewport: {
    //   width: 1920,
    //   height: 1080
    // }
  });
  let page = await browser.newPage();
  const url = "https://hyf.js.org/react-naive-book/";
  console.log("加载首页");
  await page.goto(url);
  // 获取当前页面的document数据
  await page.content();

  // 隐藏右侧的侧边栏 底部联系方式
  await page.evaluate(() => {
    document.querySelector("#float-wechat").style.display = "none";
    const footers = document.querySelectorAll(".content .block");
    footers.forEach((item, index, arr) => {
      if (index > 2) {
        arr[index].style.display = "none";
      }
    });
  });

  // 说明
  const license = `
    <p>
      本<a href="http://huziketang.mangojuice.top/books/react/" target="_blank">《React.js小书》</a>的PDF版本
      <br />
      是由<a href="https://lxchuan12.cn" target="_blank">
        若川 https://lxchuan12.cn
      </a>
      <br/>
      使用<a href="https://github.com/GoogleChrome/puppeteer" target="_blank">node 库 puppeteer爬虫生成</a>，
      仅供学习交流，严禁用于商业用途。
      <br/>
    <p>
  `;

  // 简单配置
  const config = {
    // 输出路径
    outputPath: "reactMiniBook/",
    // 生成pdf时的页边距
    margin: {
      top: "60px",
      right: "0px",
      bottom: "60px",
      left: "0px",
    },
    // 生成pdf时是否显示页眉页脚
    displayHeaderFooter: false,
    // 生成pdf页面格式
    format: "A4",
  };

  // 添加页眉页脚
  let wh = await page.evaluate((license) => {
    const content = document.querySelector("#wrapper .content");
    const div = document.createElement("div");
    div.innerHTML = `
			<div class="block">
				<h2>《Reac.js 小书》的PDF版本说明</h2>
				${license}
			</div>
		`;
    content.appendChild(div);
    return {
      width: 1920,
      height: document.body.clientHeight,
    };
  }, license);

  // 设置视图大小
  await page.setViewport(wh);
  await page.content();
  // 等待2s
  // await page.waitFor(2000);

  const outputPath = resolve(config.outputPath);
  const isExists = fs.existsSync(outputPath);

  console.log("isExists", isExists, "outputPath", outputPath);

  // 如果不存在 则创建
  if (!isExists) {
    mkdirOutputpath(outputPath);
  } else {
    // 存在，则删除该目录下的文件重新生成PDF 简单处理
    rm(outputPath, (err) => {
      if (err) throw err;
      console.log("删除文件夹成功");
      mkdirOutputpath(outputPath);
    });
  }

  console.log("outputPath", outputPath);

  await page.pdf({
    path: resolve(config.outputPath, "0. React 小书 目录.pdf"),
    margin: config.margin,
    displayHeaderFooter: config.displayHeaderFooter,
    format: config.format,
  });

  console.log("首页目录生成成功！");
  await page.close();

  console.log("start the other page...");
  page = await browser.newPage();
  await page.goto(`${url}lesson1`);
  await page.content();

  // 隐藏菜单栏，以及右侧的侧边栏 底部联系方式
  const hideDom = async () => {
    await page.evaluate(() => {
      let leftNavNode = document.querySelector("#table-of-content");
      const shares = document.querySelectorAll(".share-block");
      shares.forEach((item, index, arr) => {
        arr[index].style.display = "none";
      });
      if (leftNavNode) {
        leftNavNode.style.display = "none";
      }
    })
  }

  hideDom();
  let aLinkArr = await page.evaluate(() => {
    // 隐藏左侧导航，便于生成pdf
    let aLinks = [...document.querySelectorAll("#table-of-content a")];
    aLinks = aLinks.map((a) => {
      return {
        href: a.href.trim(),
        text: a.innerText.trim(),
      };
    });
    return aLinks.filter((a) => a.href.includes("lesson"));
  });

  for (let i = 0; i < aLinks.length; i++) {
    const {text, href} = aLinkArr[i];
    await page.goto(href);
    await page.content();
    hideDom();

    let wh = await page.evaluate((license) => {
      return {
        width: 1920,
        height: document.body.clientHeight,
      };
    }, license);
    
    await page.setViewport(wh);
    await page.content();

    await page.pdf({
			path: resolve(config.outputPath, `${text}.pdf`),
			margin: config.margin,
			displayHeaderFooter: config.displayHeaderFooter,
			format: config.format,
		});
  }

  console.log("所有生成pdf成功！");

  // 关闭浏览器
  browser.close();
})();
