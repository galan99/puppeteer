const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const PDFMerger = require('pdf-merger-js');
const {convertWordFiles} = require("convert-multiple-files"); //引入convert-multiple-files模块;


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

// 下载文件
function downloadFile (url, filePath) {
  return axios({
    method: "get",
    url: url,
    responseType: "stream",
    setTimeout: 1000 * 60 * 20,
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  }).then((response) => {
    response.data.pipe(fs.createWriteStream(filePath));
  });
};

// 读取文件夹
// fs.readdirSync("./download")

// doc转pdf
// await convertWordFiles(path.resolve(__dirname, './download/1落户.doc'), 'pdf', path.resolve(__dirname, './download/'))

(async () => {


  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto("https://www.tdx.com.cn/products/user_redbook_style2.asp", {
    waitUntil: "networkidle0",
    timeout: 60000,
  });
  
  console.log("加载首页");
  // await page.waitForTimeout(1000)

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

  // 获取所有的链接
  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a"));
    return anchors.map((anchor) => anchor.href).filter((href) => href.includes("userdoc"));
  });

  // 下载所有链接文件
  const downloadArr = links.map((link, index) => {
    const filename = decodeURIComponent(link).split("/").pop();
    const filePath = resolve(output, filename);
    return {
      url: link,
      output: filePath,
    }
  });

  //await Promise.all(downloadArr.map((item) => downloadFile(item.url, item.output)));
  console.log("下载所有链接文件完成");

  // 所有doc文件转pdf
  const docArr = fs.readdirSync(outputPath).filter((el) => el.includes(".doc"));
  console.log("获取doc列表", docArr.length);
  const docToPdf = docArr.map((doc) => {
    const docPath = resolve(output, doc);
    const pdfPath = resolve(output);

    return {
      docPath,
      pdfPath,
    };
  });

  console.log("开始转换doc文件...");
  //await Promise.all(docToPdf.map((item) => convertWordFiles(item.docPath, "pdf", item.pdfPath)));
  console.log("doc转pdf完成");

  // 合并pdf
  const pdfArr = fs.readdirSync(outputPath).filter((el) => el.includes(".pdf"));
  console.log("获取所有pdf列表", pdfArr.length);

  const merger = new PDFMerger();
  for (let i = 0; i < pdfArr.length; i++) {
    const pdfPath = resolve(output, pdfArr[i]);
    console.log("pdfPath", pdfPath);
    await merger.add(pdfPath).catch((err) => {
      console.log(i, pdfPath, err);
    });
  }
  
  console.log("开始合并pdf...");
  await merger.save(resolve(output, "合并.pdf"));
  console.log("合并pdf完成");

  await page.close();
  await browser.close();
})();