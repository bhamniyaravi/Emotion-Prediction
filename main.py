from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.preprocessing.text import Tokenizer
from fastapi import FastAPI , HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field
from keras.models import load_model
from fastapi.responses import FileResponse
import pickle
import numpy as np
import re


"""
1. we are going to make some constants
A. Model Path (BIGRU)
B. Tokenizer Path
C. Max Sequence Lenght
D. Emotion Labels
E. Emotion Emojis 

"""


# A. Model Paht (BIGRU)
model_path = "Models/BIGRU_model.keras"

# B. Tokenizer Path 
Tokenizer_path = "Models/tokenizer.pkl"

# C. Max Sequence Length
max_sequence_length = 50

# D. Emotions Labels 
emotion_labels = ['sadness', 'joy', 'love', 'anger', 'fear', 'surprise']

# E. emotions Emojis 
emotions_emojis = {
    "sadness": "😢",
    "joy": "😄",
    "love": "❤️",
    "anger": "😠",
    "fear": "😨",
    "surprise": "😲",
}

"""
2. Preprocess the Upcoming text
Cleans eaw text so it matches the format use while training
A. Lowercase
B. Remove apostrophes(can't -> cant)
C. Remove special Characters and Puncuation
D. Remove extra spaces
"""

def preprocess_text(text: str) -> str:
   
    text = text.lower()
    text = re.sub(r"'","",text)
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"www\.\S+", "", text)
    text = re.sub(r"https\S+", "", text)
    text = re.sub(r"[^a-z0-9\s]", "", text)
    text = re.sub(r"\s+", " ", text)   # Remove extra spaces
    return text.strip()


"""
3. Request Response Schemas
A. Text Input --> Input Schema the text sent by user   
B. Prediction Response 
C. Health Response (server Health Check)
"""

class TextInput(BaseModel):
    """User Text Input"""
    text : str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description = "The sentence to analyze",
        json_schema_extra = {"example": "I feel so happy and excited"}
    )


class PredictionResponse(BaseModel):
    text : str
    prediction_emotion: str
    confidence : float 
    all_probabilities : dict[str, float]

class HealthResponse(BaseModel):
    # allow the "model_loaded" field name (avoids pydantic's protected "model_" namespace warning)
    model_config = {"protected_namespaces": ()}

    status : str
    model_loaded : bool

"""
4. Model Loading and LifeSpan Management
load the model and tokenizer once the server starts up

"""

dl_model = {} # {1. BIGRU, 2. Tokenizer} -> True

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading the Model and tokenizer.....")
    dl_model["BIGRU"] = load_model(model_path)  # BIGRU model
    with open(Tokenizer_path, 'rb') as file:
        dl_model["Tokenizer"] = pickle.load(file)  # tokenizer model
    print('Model are Loaded Successfully')

    yield #Pause, model is loaded and server is running and at this point model wait for request

    dl_model.clear() # ek baar server bnd ho gya uske baad model ko memory se hta do

"""
5. Mount the static files to the Fastapi app
-> Enable CORS (Cross-Origin Resource sharing) to allow requests from differnet origins.
"""

app = FastAPI(
    lifespan = lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount('/static', StaticFiles(directory="static"), name="static")

"""
6. API Endpoints
-> Serve UI at homepage ('/)
-> Health Check Endpoint ('/health')
-> Predict Emotion Endpoint ('/predict')
"""

# -> Serve UI at homepage ('/)
@app.get('/', include_in_schema=False)
def server_ui():
    return FileResponse('static/index.html')

# -> Health check Endpoint ('/health')
@app.get('/health', response_model=HealthResponse)
def health_check():
    return HealthResponse(status="Server is Running", model_loaded = bool(dl_model))

# -> Predict Emotion Endpoint ('/predict')
@app.post('/predict', response_model = PredictionResponse)
def predict_emotion(text_input: TextInput):
    """
    1. Cleans Input Text
    2. convert the words into numeric form (Tokenizer)
    3. pad the sequence to ensure uniform length
    4. Run prediction using the Bigru model
    5. return the top emotion and full probability breakdown
    """

    BIGRU_model = dl_model.get("BIGRU")
    tokenizer_model = dl_model.get("Tokenizer")

    if BIGRU_model is None or tokenizer_model is None:
        raise HTTPException(status_code = 503, detail = "Model is not loaded yet. Please try again later")

    #1.
    cleaned_text = preprocess_text(text_input.text)

    #2. and 3
    tokenized_text = tokenizer_model.texts_to_sequences([cleaned_text])
    padded_sequence = pad_sequences(
        tokenized_text,
        maxlen=max_sequence_length,
        padding = 'post',
        truncating = 'post'
    )

    probabilities = BIGRU_model.predict(padded_sequence)[0]

    top_emotion_index = int(np.argmax(probabilities))
    all_probabilities = {
        label: float(prob) for prob, label in zip(probabilities, emotion_labels)
            
    }

    return PredictionResponse(
        text=text_input.text,
        prediction_emotion=emotion_labels[top_emotion_index],
        confidence=float(probabilities[top_emotion_index]),
        all_probabilities=all_probabilities
    )





        
        




