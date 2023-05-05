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

	document.querySelector("#saveConfig").addEventListener("click", save_Config);
	document.querySelector("#modify-tags").addEventListener("click", modifyTags);
	document.querySelector("#modify-tags-folder").addEventListener("click", modifyTags_folder);
});

const fs = require("fs");
const path = require("path");

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



async function save_Config(){
	const configToSave = {
		labelsPath: document.querySelector("#labels-path").value,
		modelPath: document.querySelector("#model-path").value,
		outPath: document.querySelector("#out-path").value,
		generalThreshold: document.querySelector("#general-threshold").value,
		characterThreshold: document.querySelector("#character-threshold").value
	  };
	  
	saveConfig(configToSave);
	console.log("save!");
	writeToConsole("save!");
}


async function modifyTags() {
	const labelsPath = document.getElementById("labels-path").value;
	const modelPath = document.getElementById("model-path").value;
	const outPath = document.getElementById("out-path").value;
	const generalThreshold = document.getElementById("general-threshold").value;
	const characterThreshold = document.getElementById("character-threshold").value;

	// 取得 Eagle 应用当前被选中的文件
	let items = await eagle.item.getSelected();
	tagModifier(items,labelsPath,modelPath,outPath,generalThreshold,characterThreshold);
}

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

async function modifyTags_folder() {
	const labelsPath = document.getElementById("labels-path").value;
	const modelPath = document.getElementById("model-path").value;
	const outPath = document.getElementById("out-path").value;
	const generalThreshold = document.getElementById("general-threshold").value;
	const characterThreshold = document.getElementById("character-threshold").value;

	// 取得 Eagle 应用当前被选中的文件夹，获取其id并找到文件夹下的图片
	let folder = (await eagle.folder.getSelected())[0];
	let allFolderIds = await getAllFolderIds(folder);
	console.log(allFolderIds);
	items = []
	for(let i = 0; i < allFolderIds.length; i++){
		let item = await eagle.item.get({ folders:[allFolderIds[i]]
		});
		items = items.concat(item)
	}
	tagModifier(items,labelsPath,modelPath,outPath,generalThreshold,characterThreshold);
}


// 引入 python-shell
const { PythonShell } = require("python-shell");

async function tagModifier(items,labelsPath,modelPath,outPath,generalThreshold,characterThreshold) {
	console.log("tagModifier called");
	
	const concurrencyLimit = 5; // 设置并发数量限制
	const tasks = [];
	
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
    	const imagePath = item.filePath;

		const options = {
			pythonPath: '.\\Plugin\\TaggerforEagle\\venv\\Scripts\\python.exe',
			scriptPath: ".\\Plugin\\TaggerforEagle",
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
			item.tags = results;
	
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


