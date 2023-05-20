from __future__ import annotations

import argparse
# import functools
import html
import os

import numpy as np
import onnxruntime as rt
import pandas as pd
import piexif
import piexif.helper
import PIL.Image

import csv

import dbimutils



def load_model(model_filepath: str) -> rt.InferenceSession:
    # model_filepath=r"G:\givemessr\wd-v1-4-convnextv2-tagger-v2\model.onnx"
    model = rt.InferenceSession(model_filepath)
    return model

# def change_model(model_name):
#     global loaded_models

#     model = load_model(model_name)

#     loaded_models[model_name] = model
#     return loaded_models[model_name]


def load_labels(path) -> list[str]:

    df = pd.read_csv(path)

    tag_names = df["name"].tolist()
    rating_indexes = list(np.where(df["category"] == 9)[0])
    general_indexes = list(np.where(df["category"] == 0)[0])
    character_indexes = list(np.where(df["category"] == 4)[0])
    return tag_names, rating_indexes, general_indexes, character_indexes

def plaintext_to_html(text):
    text = (
        "<p>" + "<br>\n".join([f"{html.escape(x)}" for x in text.split("\n")]) + "</p>"
    )
    return text

def predict(
    image: PIL.Image.Image,
    # model_name: str,
    general_threshold: float,
    character_threshold: float,
    tag_names: list[str],
    rating_indexes: list[np.int64],
    general_indexes: list[np.int64],
    character_indexes: list[np.int64],
):
    global loaded_models

    rawimage = image
    model_name=list(loaded_models.keys())[0]
    model = loaded_models[model_name]
    # if model is None:
    #     model = change_model(model_name)

    _, height, width, _ = model.get_inputs()[0].shape

    # Alpha to white
    image = image.convert("RGBA")
    new_image = PIL.Image.new("RGBA", image.size, "WHITE")
    new_image.paste(image, mask=image)
    image = new_image.convert("RGB")
    image = np.asarray(image)

    # PIL RGB to OpenCV BGR
    image = image[:, :, ::-1]

    image = dbimutils.make_square(image, height)
    image = dbimutils.smart_resize(image, height)
    image = image.astype(np.float32)
    image = np.expand_dims(image, 0)

    input_name = model.get_inputs()[0].name
    label_name = model.get_outputs()[0].name
    probs = model.run([label_name], {input_name: image})[0]

    labels = list(zip(tag_names, probs[0].astype(float)))

    # First 4 labels are actually ratings: pick one with argmax
    ratings_names = [labels[i] for i in rating_indexes]
    rating = dict(ratings_names)

    # Then we have general tags: pick any where prediction confidence > threshold
    general_names = [labels[i] for i in general_indexes]
    general_res = [x for x in general_names if x[1] > general_threshold]
    general_res = dict(general_res)

    # Everything else is characters: pick any where prediction confidence > threshold
    character_names = [labels[i] for i in character_indexes]
    character_res = [x for x in character_names if x[1] > character_threshold]
    character_res = dict(character_res)

    combined_res = {**general_res, **character_res}

    b = dict(sorted(combined_res.items(), key=lambda item: item[1], reverse=True))
    a = (
        ", ".join(list(b.keys()))
        .replace("_", " ")
        .replace("(", "\(")
        .replace(")", "\)")
    )
    c = ", ".join(list(b.keys()))

    items = rawimage.info
    geninfo = ""

    if "exif" in rawimage.info:
        exif = piexif.load(rawimage.info["exif"])
        exif_comment = (exif or {}).get("Exif", {}).get(piexif.ExifIFD.UserComment, b"")
        try:
            exif_comment = piexif.helper.UserComment.load(exif_comment)
        except ValueError:
            exif_comment = exif_comment.decode("utf8", errors="ignore")

        items["exif comment"] = exif_comment
        geninfo = exif_comment

        for field in [
            "jfif",
            "jfif_version",
            "jfif_unit",
            "jfif_density",
            "dpi",
            "exif",
            "loop",
            "background",
            "timestamp",
            "duration",
        ]:
            items.pop(field, None)

    geninfo = items.get("parameters", geninfo)

#     info = f"""
# <p><h4>PNG Info</h4></p>    
# """
#     for key, text in items.items():
#         info += (
#             f"""
# <div>
# <p><b>{plaintext_to_html(str(key))}</b></p>
# <p>{plaintext_to_html(str(text))}</p>
# </div>
# """.strip()
#             + "\n"
#         )

#     if len(info) == 0:
#         message = "Nothing found in the image."
#         info = f"<div><p>{message}<p></div>"

    # return (a, c, rating, character_res, general_res, info)
    return a

def readImage(image_path):
    import io
    from PIL import Image
    with open(image_path, "rb") as f:
        image_data = f.read()
    pil_image = Image.open(io.BytesIO(image_data))
    return pil_image


def get_image_files(path):
    """根据路径获取图片文件的全部路径"""
    
    files = []
    if os.path.isfile(path):  # 如果是文件
        files.append(path)
    else:  # 如果是目录
        for root, dirs, filenames in os.walk(path):
            for filename in filenames:
                ext = os.path.splitext(filename)[-1].lower()  # 获取文件后缀名，并转换为小写
                if ext in [".png", ".jpg", ".jpeg"]:
                    files.append(os.path.join(root, filename))
    # print(files)
    return files

def save_wildcards_file(out_path,out_labels,mode='a'):
    out_path_txt = out_path + '.txt'
    if not os.path.exists(out_path_txt):
        open(out_path_txt, "x", newline='', encoding='utf-8', errors='replace')
    with open(out_path_txt, mode, newline='', encoding='utf-8', errors='replace') as f:
        for value in out_labels.values():
            f.write(str(value) + "\n")
    #print('%s个文件的词已保存至%s'%(len(out_labels),out_path))

def save_tsv_file(out_path,out_labels,mode='a'):
    out_path_tsv = out_path + '.tsv'
    if not os.path.exists(out_path_tsv) or os.path.getsize(out_path_tsv) == 0:
        # Create a new file if it doesn't exist
        with open(out_path_tsv, "x", newline='', encoding='utf-8', errors='replace') as f:
            has_path = False
            has_value = False        
        # Check if the file already contains "path" and "value" columns
    else:
        with open(out_path_tsv, "r", encoding='utf-8', errors='replace') as f:
            reader = csv.reader(f, delimiter='\t')
            header = next(reader)
            has_path = "path" in header
            has_value = "value" in header
    with open(out_path_tsv, mode, newline='', encoding='utf-8', errors='replace') as f:
        writer = csv.DictWriter(f, fieldnames=["path", "value"], delimiter='\t')
        if not (has_path and has_value):
            writer.writeheader()
        for key, value in out_labels.items():
            writer.writerow({"path": key, "value": value})
    #print('%s个文件的词已保存至%s'%(len(out_labels),out_path))

def main(image_path,model_path,labels_path,general_threshold,character_threshold,out_path,mode):
    global loaded_models
    loaded_models = {"model": load_model(model_path)}
    tag_names, rating_indexes, general_indexes, character_indexes = load_labels(labels_path)
    image_paths=get_image_files(image_path)
    #print('%s路径文件已加载，共%s个'%(image_path,len(image_paths)))
    out_labels={}
    for image_path in image_paths:
        out=predict(readImage(image_path),
                    # model_name=model_name,
                    general_threshold=general_threshold,
                    character_threshold=character_threshold,
            tag_names=tag_names,
            rating_indexes=rating_indexes,
            general_indexes=general_indexes,
            character_indexes=character_indexes)
    
        out_labels[image_path]=out
    save_wildcards_file(out_path,out_labels,mode=mode)
    save_tsv_file(out_path,out_labels,mode=mode)
    for value in out_labels.values():
        tags = value.split(',')
        for tag in tags:
            print(tag)
    return 
    
parser = argparse.ArgumentParser(description='Description of your program')

parser.add_argument('-lp', '--labels_path', type=str, help="Path to the labels file")
parser.add_argument('-mp', '--model_path', type=str, help="Path to the model file")
parser.add_argument('-ip', '--image_path', type=str, help="Path to the image file")
parser.add_argument('-op', '--out_path', type=str, help="Path to the output directory")
parser.add_argument('-gt', '--general_threshold', type=float, help="General threshold value")
parser.add_argument('-ct', '--character_threshold', type=float, help="Character threshold value")
parser.add_argument('-mode', '--mode', type=str, help='write mode')
args = parser.parse_args()

labels_path = args.labels_path
model_path = args.model_path
image_path = args.image_path
out_path = args.out_path
mode=args.mode
general_threshold=float(args.general_threshold)
character_threshold=float(args.character_threshold)



main(image_path=image_path,
     model_path=model_path,
     labels_path=labels_path,
     out_path=out_path,
     mode=mode,
     general_threshold=general_threshold,
     character_threshold=character_threshold
)
