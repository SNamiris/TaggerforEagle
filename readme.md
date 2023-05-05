## 功能：
可以识别选中图片，文件夹中图片，自动打标，输出标签到适用于wildcards的txt文件和方便做成excel 的tsv文件

## 使用
1. 安装python3，运行 install.bat 等跑完，如果报错就自己在venv安装依赖
2. 安装nodejs：https://nodejs.org/en/download/，命令行运行npm install python-shell
3. 下载tagger模型
```
git clone https://huggingface.co/SmilingWolf/wd-v1-4-convnextv2-tagger-v2/
```
    源代码要求模型文件夹里面的csv文件和model文件
    模型也可以用其他的 https://huggingface.co/SmilingWolf 在这个大佬内随便找
    如果你用过webui的tagger，直接用原设也行，webui的默认文件位置在~\\.cache里，你只需要更改user之后的用户名
4. 打开插件，填写模型和模型tag保存位置，输出tag集的文件名（不用带后缀，会自动保存适用于wildcards的txt文件和方便做成excel 的tsv文件），设置阈值
5. 保存设置，选择功能




## 说明：
1. 注意这里的tagger用的是cpu，可能会很卡，如果太卡可以把plugin.js的并行数减小一点

2. 由于异步的关系，输出的序号可能有点问题，不是按顺序来的

3. 文件夹会递归查找所有子文件夹的图片

4. 多次打标同一文件会在tag输出文件输出多次同一tag，但不会对图片文件增加同一tag。这会浪费计算资源，建议使用对未tag的文件打标的那个选项



## 致谢：
主要的tagger部分代码：Nubulae
主要的js部分代码：GPT-4
