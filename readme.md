## 功能：
可以识别选中图片，文件夹中图片，自动打标，输出标签到适用于wildcards的txt文件和方便做成excel 的tsv文件

## 使用
1. 给个python3，运行 install.bat 等跑完，如果报错就自己在venv安装依赖
2. git clone https://huggingface.co/SmilingWolf/wd-v1-4-convnextv2-tagger-v2/
源代码要求wd-v1-4-convnextv2-tagger-v2里面的csv文件
模型可以用其他的 https://huggingface.co/SmilingWolf 在这个大佬内随便找
如果你用过webui的tagger，直接用原设也行，webui的默认文件位置在~\\.cache里
3. 打开插件，填写模型和模型tag保存位置，输出tag集的文件名（不用带后缀，会自动保存适用于wildcards的txt文件和方便做成excel 的tsv文件），设置阈值
4. 保存设置，选择运行模式




## 说明：
注意这里的tagger用的是cpu，可能会很卡，如果太卡可以把plugin.js的并行数减小一点

由于异步的关系，输出的序号可能有点问题，不是按顺序来的

文件夹会递归查找所有子文件夹的图片

多次打标同一文件会在tag输出文件输出多次同一tag，但不会对图片文件增加同一tag

如果没反应可能是需要安装：
nodejs：https://nodejs.org/en/download/
然后命令行运行
npm install python-shell

## 致谢：
主要的tagger部分代码：Nubulae
主要的js部分代码：GPT-4
