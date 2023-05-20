import json
import os

# 将这里替换为你的 JSON 文件路径
json_file_path = r'D:\Tools\Eagle\Plugin\TaggerforEagle\test.json'
output_txt_file_path = r'D:\Tools\Eagle\Plugin\TaggerforEagle\file.txt'

# 读取 JSON 文件
with open(json_file_path, 'r', encoding='UTF-8') as f:
    data = json.load(f)

# 提取所有的 prompt 内容，并替换 \n 为空字符
prompts = [entry['prompt'].replace('\n', '') for entry in data if 'prompt' in entry]

# 将结果写入到新的 txt 文件
with open(output_txt_file_path, 'w') as f:
    for prompt in prompts:
        f.write(prompt + '\n')


