import sys
import json
import os
import numpy as np
from PIL import Image
import torch
import open_clip

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BREEDS_PATH = os.path.join(SCRIPT_DIR, "breeds.json")

# ── Zero-shot label sets ───────────────────────────────────────────────────────
COLORS = [
    "black", "white", "brown", "golden", "orange", "gray", "cream", "tan",
    "red", "blue-gray", "black and white", "brown and white", "tri-color",
]

# Used as "a {pattern} dog/cat" — short single words read better with CLIP
COAT_PATTERNS = [
    "solid", "spotted", "striped", "tabby", "brindle",
    "merle", "tuxedo", "calico", "tortoiseshell", "bicolor",
]

SIZES = ["small", "medium", "large"]
PET_TYPES = ["dog", "cat"]

# Minimum softmax confidence to accept a tag (tune as needed)
MIN_CONF = {
    "petType":     50,   # reasonably high — wrong type poisons downstream tags
    "color":       15,   # many options; lower bar since colour is useful even if rough
    "size":        30,
    "coatPattern": 20,
    "breed":       10,   # hardest task — low bar so we always get a guess
}


def softmax_np(sims, temp=100.0):
    x = np.array(sims, dtype=np.float64) * temp
    x -= x.max()
    e = np.exp(x)
    return e / e.sum()


def zero_shot(img_feat_np, model, tokenizer, labels, template):
    """
    img_feat_np : numpy [1, D], already L2-normalised
    template    : format string with one {} placeholder, e.g. "a {} dog"
    Returns     : (best_label, confidence_pct 0-100)
    """
    texts = [template.format(lbl) for lbl in labels]
    tokens = tokenizer(texts)
    with torch.no_grad():
        txt_feat = model.encode_text(tokens)
        txt_feat = txt_feat / txt_feat.norm(dim=-1, keepdim=True)
    txt_np = txt_feat.cpu().numpy().astype(np.float32)   # [N, D]
    sims = (img_feat_np @ txt_np.T).flatten()             # [N]
    probs = softmax_np(sims)
    best = int(np.argmax(probs))
    return labels[best], int(round(probs[best] * 100))


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "missing image path"}))
        sys.exit(1)

    image_path = sys.argv[1]

    device = "cpu"
    model_name = "ViT-B-32"
    pretrained = "openai"

    model, _, preprocess = open_clip.create_model_and_transforms(
        model_name, pretrained=pretrained
    )
    tokenizer = open_clip.get_tokenizer(model_name)
    model.eval()
    model.to(device)

    img = Image.open(image_path).convert("RGB")
    image_tensor = preprocess(img).unsqueeze(0).to(device)

    with torch.no_grad():
        features = model.encode_image(image_tensor)
        features = features / features.norm(dim=-1, keepdim=True)

    feat_np = features.cpu().numpy().astype(np.float32)   # [1, D]
    emb_list = feat_np.flatten().tolist()

    # ── Zero-shot tagging ──────────────────────────────────────────────────────
    tags = {}

    # 1. Pet type — determines which templates / breed list to use below
    pt_label, pt_conf = zero_shot(feat_np, model, tokenizer, PET_TYPES, "a photo of a {}")
    animal = pt_label if pt_conf >= MIN_CONF["petType"] else "animal"
    if pt_conf >= MIN_CONF["petType"]:
        tags["petType"] = pt_label

    # 2. Colour  — "a black dog", "a golden cat", …
    color_label, color_conf = zero_shot(feat_np, model, tokenizer, COLORS, "a {} " + animal)
    if color_conf >= MIN_CONF["color"]:
        tags["color"] = color_label

    # 3. Size  — "a small dog", "a large cat", …
    size_label, size_conf = zero_shot(feat_np, model, tokenizer, SIZES, "a {} " + animal)
    if size_conf >= MIN_CONF["size"]:
        tags["size"] = size_label

    # 4. Coat pattern  — "a tabby cat", "a spotted dog", …
    coat_label, coat_conf = zero_shot(feat_np, model, tokenizer, COAT_PATTERNS, "a {} " + animal)
    if coat_conf >= MIN_CONF["coatPattern"]:
        tags["coatPattern"] = coat_label

    # 5. Breed — only if breeds.json exists (fetched at build time)
    if os.path.exists(BREEDS_PATH):
        with open(BREEDS_PATH) as f:
            breeds_data = json.load(f)

        breed_list = breeds_data.get("dogs" if pt_label == "dog" else "cats", [])
        if breed_list:
            breed_label, breed_conf = zero_shot(
                feat_np, model, tokenizer, breed_list,
                "a photo of a {} " + animal
            )
            if breed_conf >= MIN_CONF["breed"]:
                tags["breed"] = breed_label

    print(json.dumps({
        "model": f"{model_name}:{pretrained}",
        "embedding": emb_list,
        "tags": tags,
    }))


if __name__ == "__main__":
    main()
