# 🎭 Emotion Prediction — Text Emotion Classifier

A deep-learning + NLP web app that reads a sentence and predicts the **emotion** behind it across six classes: **sadness, joy, love, anger, fear, surprise**.

Type a line like *"I finally finished my project after three sleepless nights"* and the model returns the top emotion, a confidence score, and a full probability breakdown across all six emotions.

> **Live demo:** _add your Render URL here_
> **Model:** Bidirectional GRU · **Test accuracy:** ~92%

---

## ✨ Features

- **6-emotion classification** from free text
- **Bidirectional GRU** model that reads each sentence in both directions for better context
- **FastAPI** backend with a clean REST API (`/predict`, `/health`)
- **Interactive web UI** ("Emotion Spectrometer") showing the top emotion + confidence + full probability spread
- End-to-end: from data → model experiments → trained model → deployed web service

---

## 🧠 How it works

```
raw text ──▶ clean (lowercase, strip URLs/punctuation)
        ──▶ tokenize (word → integer, vocab ≈ 15k)
        ──▶ pad to length 50
        ──▶ Bidirectional GRU model
        ──▶ softmax over 6 emotions ──▶ top emotion + probabilities
```

The training notebook builds and compares four recurrent architectures before selecting the best one.

## 📊 Model comparison

| Model                     | Test accuracy |
| ------------------------- | ------------- |
| SimpleRNN                 | ~32%          |
| LSTM                      | (baseline)    |
| GRU                       | (baseline)    |
| **Bidirectional GRU** ⭐  | **~92%**      |

> The plain RNN/LSTM/GRU models were quick single-run baselines (20 epochs, early stopping) and did not fully converge. The tuned **Bidirectional GRU** — 300-dim embeddings, two bi-directional GRU layers (128 → 64 units), dropout 0.4, class weights for imbalance — was the clear winner and is the model served by the app.

---

## 🛠️ Tech stack

- **Language:** Python 3.11
- **Deep learning:** TensorFlow / Keras
- **NLP:** Keras `Tokenizer`, sequence padding
- **Dataset:** [`dair-ai/emotion`](https://huggingface.co/datasets/dair-ai/emotion) (Hugging Face)
- **Backend:** FastAPI + Uvicorn
- **Frontend:** HTML / CSS / JavaScript
- **Deployment:** Render

---

## 📁 Project structure

```
Emotion-Prediction/
├── main.py                        # FastAPI app (loads model, serves /predict & UI)
├── Models/
│   ├── BIGRU_model.keras          # trained Bidirectional GRU model
│   └── tokenizer.pkl              # fitted tokenizer
├── static/                        # web UI (index.html, style.css, script.js)
├── emotions_analysize_model.ipynb # training + model comparison notebook
├── requirements.txt
└── runtime.txt                    # Python version pin (3.11.9)
```

---

## 🚀 Run locally

```bash
# 1. clone
git clone https://github.com/bhamniyaravi/Emotion-Prediction.git
cd Emotion-Prediction

# 2. create & activate a virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 3. install dependencies
pip install -r requirements.txt

# 4. start the server
uvicorn main:app --reload
```

Then open **http://localhost:8000** in your browser.

---

## 🔌 API

### `POST /predict`

Request:

```json
{ "text": "I feel so happy and excited" }
```

Response:

```json
{
  "text": "I feel so happy and excited",
  "prediction_emotion": "joy",
  "confidence": 0.99,
  "all_probabilities": {
    "sadness": 0.00, "joy": 0.99, "love": 0.00,
    "anger": 0.00, "fear": 0.00, "surprise": 0.00
  }
}
```

### `GET /health`

Returns server status and whether the model is loaded.

---

## ☁️ Deployment (Render)

**Web service settings:**

- **Build command:** `pip install -r requirements.txt`
- **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Python version:** pinned in `runtime.txt` (`3.11.9`)

**⚠️ Important — Keras version must match the saved model.** The model in `Models/` was saved with **Keras 3.13.2**. Loading it with an older Keras (e.g. 3.5.0) fails with:

```
ValueError: Unrecognized keyword arguments passed to Embedding: {'quantization_config': None}
```

`requirements.txt` therefore pins `keras>=3.13.2` (currently `keras==3.15.0` + `tensorflow-cpu==2.21.0`). If you retrain and re-save the model, keep the serving Keras version equal to or newer than the version used to save it.

**Memory note:** TensorFlow is memory-heavy. If the service is killed on startup on a small (512 MB) free instance, use a larger instance type.

---

## 📚 Dataset

[`dair-ai/emotion`](https://huggingface.co/datasets/dair-ai/emotion) — English Twitter messages labeled with six emotions.

## 👤 Author

Built by [@bhamniyaravi](https://github.com/bhamniyaravi) _(add your name here)_
