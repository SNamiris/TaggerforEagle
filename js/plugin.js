eagle.onPluginCreate(async (plugin) => {
	console.log('eagle.onPluginCreate');
	console.log(plugin);
	// document.querySelector('#message').innerHTML = `
	// <ul>
	// 	<li>id: ${plugin.manifest.id}</li>
	// 	<li>version: ${plugin.manifest.version}</li>
	// 	<li>name: ${plugin.manifest.name}</li>
	// 	<li>logo: ${plugin.manifest.logo}</li>
	// 	<li>path: ${plugin.path}</li>
	// </ul>
	// `;
	const config = readConfig();
	document.querySelector("#labels-path").value = config.labelsPath;
	document.querySelector("#model-path").value = config.modelPath;
	document.querySelector("#out-path").value = config.outPath;
	document.querySelector("#general-threshold").value = config.generalThreshold;
	document.querySelector("#character-threshold").value = config.characterThreshold;
	document.querySelector("#concurrencyLimit").value = config.concurrencyLimit;

	document.querySelector("#saveConfig").addEventListener("click", save_Config);
	document.querySelector("#modifyTags").addEventListener("click", modifyTags);
	document.querySelector("#modifyTags_folder").addEventListener("click", modifyTags_folder);
	document.querySelector("#modifyTags_folder_untagged").addEventListener("click", modifyTags_folder_untagged);

	// 导出标签
	document.querySelector("#export-path").value = config.exportPath;
	document.querySelector("#exportTags").addEventListener("click", exportTags);
	document.querySelector("#exportTags_folder").addEventListener("click", exportTags_folder);

	// 导出ai生成信息
	document.querySelector("#export-path-AI").value = config.exportPathAI;
	document.querySelector("#exportAIinfo").addEventListener("click", exportAIinfo);
	document.querySelector("#exportAIinfo_folder").addEventListener("click", exportAIinfo_folder);
	document.querySelector("#convert2wildcards").addEventListener("click", convert2wildcards);
});

const fs = require("fs");
const path = require("path");

const exifReader = require('exifreader');

const configFilePath = path.join(__dirname, "config.json");

// 保存配置数据
function saveConfig(data) {
  fs.writeFileSync(configFilePath, JSON.stringify(data, null, 2));
}

// 读取配置数据
function readConfig() {
  if (fs.existsSync(configFilePath)) {
    const rawData = fs.readFileSync(configFilePath);
    return JSON.parse(rawData);
  }
  return {}; // 返回空对象，如果配置文件不存在
}

function writeToConsole(message) {
	const consoleOutput = document.getElementById("console-output");
	consoleOutput.textContent += message + "\n";
}

// 保存设置
async function save_Config(){
	const configToSave = {
		labelsPath: document.querySelector("#labels-path").value,
		modelPath: document.querySelector("#model-path").value,
		outPath: document.querySelector("#out-path").value,
		generalThreshold: document.querySelector("#general-threshold").value,
		characterThreshold: document.querySelector("#character-threshold").value,
		concurrencyLimit: document.querySelector("#concurrencyLimit").value,
		exportPath: document.querySelector("#export-path").value,
		exportPathAI: document.querySelector("#export-path-AI").value
	};
	  
	saveConfig(configToSave);
	console.log("save!");
	writeToConsole("save!");
}

// 修改选中文件标签
async function modifyTags() {

	// 取得 Eagle 应用当前被选中的文件
	let items = await eagle.item.getSelected();
	tagModifier(items);
}

// 取得所有文件夹id
async function getAllFolderIds(folder, includeSelf = true, folderIds = []) {
	if (includeSelf) {
		folderIds.push(folder.id);
	}
	
	let children = folder.children;
	for (let i = 0; i < children.length; i++) {
		let child = children[i];
		folderIds.push(child.id);
		await getAllFolderIds(child, false, folderIds);
	}
	return folderIds;
}

// 修改当前文件夹所有文件标签
async function modifyTags_folder() {

	// 取得 Eagle 应用当前被选中的文件夹，获取其id并找到文件夹下的图片
	let folder = (await eagle.folder.getSelected())[0];
	let allFolderIds = await getAllFolderIds(folder);
	console.log(allFolderIds);
	items = []
	for(let i = 0; i < allFolderIds.length; i++){
		let item = await eagle.item.get({ folders:[allFolderIds[i]]
		});
		items = items.concat(item);
	}
	tagModifier(items);
}

// 修改当前文件夹所有未打标的文件标签
async function modifyTags_folder_untagged() {

	// 取得 Eagle 应用当前被选中的文件夹，获取其id并找到文件夹下的图片
	let folder = (await eagle.folder.getSelected())[0];
	let allFolderIds = await getAllFolderIds(folder);
	console.log(allFolderIds);
	items = []
	for(let i = 0; i < allFolderIds.length; i++){
		let item = await eagle.item.get({ folders:[allFolderIds[i]]
		});
		items = items.concat(item);
	}
	// 去掉已经打过tag的文件
	items = items.filter(item => item.tags && item.tags.length == 0);
	tagModifier(items);
}


// 引入 python-shell
const { PythonShell } = require("python-shell");
// 调用py打标
async function tagModifier(items) {
	console.log("tagModifier called");
	writeToConsole('call tagModifier');
	
	const labelsPath = document.getElementById("labels-path").value;
	const modelPath = document.getElementById("model-path").value;
	const outPath = document.getElementById("out-path").value;
	const generalThreshold = document.getElementById("general-threshold").value;
	const characterThreshold = document.getElementById("character-threshold").value;

	const concurrencyLimit = document.querySelector("#concurrencyLimit").value; // 设置并发数量限制
	const tasks = [];
	
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
    	const imagePath = item.filePath;

		const options = {
			pythonPath: '.\\Plugin\\TaggerforEagle\\venv\\Scripts\\python.exe',
			scriptPath: ".\\Plugin\\TaggerforEagle\\pyutils",
			args: [
				"-ip", imagePath,
				"-lp", labelsPath,
				"-mp", modelPath,
				"-op", outPath,
				"-gt", generalThreshold,
				"-ct", characterThreshold,
				"-mode", "a"
			],
		};
		
		// 创建异步任务
		const task = PythonShell.run("givemessr.py", options).then(results => {
			// 修改标签
			results.forEach(result => {
				// 检查 item.tags 是否已经包含该元素
				if (!item.tags.includes(result)) {
				  // 如果不包含，将元素添加到 item.tags 数组中
				  item.tags.push(result);
				}
			});
	
			// 保存修改
			item.save();
	
			console.log(`${i + 1} of ${items.length} images modifyTags finished`);
			writeToConsole(`${i + 1} of ${items.length} images modifyTags finished`);
		});
	
		tasks.push(task);
	
		// 如果达到并发限制，等待已有任务完成
		if (tasks.length >= concurrencyLimit || i === items.length - 1) {
			await Promise.all(tasks);
			tasks.length = 0;
		}
	}
	console.log("tagModifier finished");
	writeToConsole('Complete!');
}

// 导出文件标签
async function Tagsexport(items) {
	const exportPath = document.getElementById("export-path").value + '.txt';

	let tags = '';

	items.forEach((item) => {
		let itemtags = item.tags.join(',');
		tags += itemtags + '\n';
	});

	fs.appendFile(exportPath, tags, (err) => {
		if (err) throw err;
		console.log('tags written to file');
	});
	writeToConsole('ExportTags Complete!');
}

// 导出选中文件标签
async function exportTags() {

	// 取得 Eagle 应用当前被选中的文件
	let items = await eagle.item.getSelected();
	
	Tagsexport(items)
}

// 导出文件夹内文件标签
async function exportTags_folder() {

	// 取得 Eagle 应用当前被选中的文件
	let folder = (await eagle.folder.getSelected())[0];
	let allFolderIds = await getAllFolderIds(folder);
	console.log(allFolderIds);
	items = []
	for(let i = 0; i < allFolderIds.length; i++){
		let item = await eagle.item.get({ folders:[allFolderIds[i]]
		});
		items = items.concat(item);
	}

	Tagsexport(items)
}

// 获取图片元数据
async function readInfoFromImage(imagePath) {
    // Read the file directly to get a buffer
    const data = fs.readFileSync(imagePath);
    const exif = exifReader.load(data);
    const parameters = exif['parameters'] ? exif['parameters']['description'] : '';

    let geninfo = parameters || null;
    let items = exif;

    // TODO: You may want to delete unnecessary fields from items

    if (items['Software'] === 'NovelAI') {
        try {
            let jsonInfo = JSON.parse(items['Comment']);
            let sampler = samplersMap[jsonInfo['sampler']] || 'Euler a';  // Assuming samplersMap is defined

            geninfo = `${items['Description']}
Negative prompt: ${jsonInfo['uc']}
Steps: ${jsonInfo['steps']}, Sampler: ${sampler}, CFG scale: ${jsonInfo['scale']}, Seed: ${jsonInfo['seed']}, Size: ${items.ExifImageWidth}x${items.ExifImageHeight}, Clip skip: 2, ENSD: 31337`;
        } catch (err) {
            console.error('Error parsing NovelAI image generation parameters:', err);
        }
    }
    if(!geninfo){
		writeToConsole(imagePath + ' No AI info');
	}
    return [geninfo, items];
}

// 提取参数
// This function is used to parse the parameter information text
async function parseData(text) {
	if (!text) {
        return {}
    }
	if (!text.startsWith('prompt:')) {
        text = 'prompt: ' + text;
    }
    // Define the keys of our data object. 
    // These should match the prompts in the parameter information text.
    const fields = ['prompt:', 'Negative prompt:', 'Steps:', 'Template:', 'Negative Template:'];
    const data = {};

    fields.forEach((field, index) => {
        let start = text.indexOf(field);
        let end = index + 1 < fields.length ? text.indexOf(fields[index + 1]) : undefined;

        // Check if end is -1
        if (end === -1) {
            end = undefined;
        }

        if (start !== -1) {
            start += field.length;
            const value = text.slice(start, end).trim();
            data[field.slice(0, -1)] = value;
        }
    });
	// 处理Steps后的内容
	data['Steps'] = 'Steps: ' + data['Steps'];
	
	let regex = /([^:]+:\s*"[^"]+"|[^,]+)/g;
	let pairs = data['Steps'].match(regex);
	
	pairs.forEach(pair => {
		let [field, ...value] = pair.split(':');
		data[field.trim()] = value.join(':').trim();
	});

    return data;
}


async function AIinfoExport(items) {
	const exportPath = document.getElementById("export-path-AI").value + '.json';

	if (fs.existsSync(exportPath)) {
		// If the file exists, read the existing data from the JSON file
		const fileData = fs.readFileSync(exportPath, 'utf-8');
		dataArray = JSON.parse(fileData);
	} else {
		// If the file does not exist, create a new file with the data object in an array
		dataArray = []
	}

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const imagePath = item.filePath;  // replace with your image path
		const [geninfo, infoitems] = await readInfoFromImage(imagePath);
		const parsedGenInfo = await parseData(geninfo);
		parsedGenInfo['imagePath'] = imagePath;
		dataArray.push(parsedGenInfo);
	}
	// console.log(parsedGenInfo);
	// Check if the file exists
	
	// Write the updated array back to the file
	fs.writeFile(exportPath, JSON.stringify(dataArray, null, 2), (err) => {
		if (err) {
		console.error('Error writing data to file:', err);
		writeToConsole('Error writing data to file:');
		} 
	});	
	writeToConsole('Successfully wrote data to file');
}

// 导出选中文件AI生成信息
async function exportAIinfo() {

	// 取得 Eagle 应用当前被选中的文件
	let items = await eagle.item.getSelected();

	AIinfoExport(items);
}

// 导出当前文件夹所有文件AI生成信息
async function exportAIinfo_folder() {

	// 取得 Eagle 应用当前被选中的文件
	let folder = (await eagle.folder.getSelected())[0];
	let allFolderIds = await getAllFolderIds(folder);
	console.log(allFolderIds);
	items = []
	for(let i = 0; i < allFolderIds.length; i++){
		let item = await eagle.item.get({ folders:[allFolderIds[i]]
		});
		items = items.concat(item);
	}

	AIinfoExport(items);
}

async function convert2wildcards(){
	const jsonFilePath = document.getElementById("export-path-AI").value + '.json';
	const wildcardsPath = document.getElementById("export-path-AI").value + '.txt';
	
	// 读取 JSON 文件
	let rawData = fs.readFileSync(jsonFilePath);

	// 解析 JSON 数据
	let jsonData = JSON.parse(rawData);

	// 新建一个数组，用于保存所有的 prompts
	let prompts = [];

	// 遍历每个 JSON 对象
	jsonData.forEach(data => {
		// 如果存在 prompt 属性，获取其值并替换 \n 为空字符
		if (data.prompt) {
			let prompt = data.prompt.replace(/\n/g, '');
			prompts.push(prompt);
		}
	});

	// 将所有的 prompts 写入到新的 txt 文件，每个 prompt 占一行
	fs.writeFileSync(wildcardsPath, prompts.join('\n'));
	writeToConsole('Successfully convert2wildcards');
}




eagle.onPluginRun(() => {
	console.log('eagle.onPluginRun');
});

eagle.onPluginShow(() => {
	console.log('eagle.onPluginShow');
});

eagle.onPluginHide(() => {
	console.log('eagle.onPluginHide');
});

eagle.onPluginBeforeExit((event) => {
	console.log('eagle.onPluginBeforeExit');
});


