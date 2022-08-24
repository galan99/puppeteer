const fs = require('fs');
const path = require('path');
const PDFMerger = require('pdf-merger-js');

function resolve(dir, dir2 = ''){
	return path.posix.join(__dirname, './', dir, dir2);
}

const config = {
	entry: 'reactMiniBook/',
	output: 'dist/'
};

const filenameArr = fs.readdirSync(resolve(config.entry));

const sortedFilenameArr = filenameArr.sort((str1, str2) => {
	let regex = /^(\d{1,2})\./;
	let a = +str1.match(regex)[1];
	let b = +str2.match(regex)[1];
	return a - b;
})

const files = sortedFilenameArr.map((el) => {
	return resolve(`${config.entry}${el}`);
});

const outputPath = resolve(config.output);

const isExists = fs.existsSync(outputPath);

function mkdirOutputpath(){
	try{
		fs.mkdirSync(outputPath);
		console.log('mkdir is successful!');
	} catch(e){
		console.log('mkdir is failed!', e);
	}
};

// 如果不存在 则创建
if(!isExists){
	mkdirOutputpath();
}

const filename = `React小书（完整版）-作者：胡子大哈.pdf`;
const output = resolve(`${config.output}${filename}`);

const merger = new PDFMerger();
(async () => {
  for(let i = 0; i < files.length; i++){
    await merger.add(files[i]);
  }
  await merger.save(output);
  console.log('merge is successful!');
})();

