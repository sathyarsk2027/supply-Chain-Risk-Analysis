# pyright: reportMissingImports=false, reportMissingModuleSource=false
# type: ignore
from typing import List
from fastapi import FastAPI  # type: ignore
from pydantic import BaseModel  # type: ignore

try:
    import spacy  # type: ignore
    from spacy.cli import download  # type: ignore
except ImportError:
    spacy = None  # type: ignore
    download = None  # type: ignore

try:
    from sentence_transformers import SentenceTransformer  # type: ignore
except ImportError:
    SentenceTransformer = None  # type: ignore

app = FastAPI(title="Supply Chain Risk Monitor NLP Service")

# Load SpaCy NLP model globally at startup
nlp = None
if spacy:
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        if download:
            download("en_core_web_sm")
            nlp = spacy.load("en_core_web_sm")

# Load SentenceTransformer model globally at startup
embedding_model = None
if SentenceTransformer:
    try:
        embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    except Exception as e:
        print(f"Warning: Could not load SentenceTransformer embedding model: {e}")


class ExtractRequest(BaseModel):
    text: str


class ExtractResponse(BaseModel):
    companies: List[str]
    locations: List[str]
    dates: List[str]
    category: str


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: List[float]


# Basic keyword classifier
KEYWORDS_LOGISTICS = [
    "port", "ship", "vessel", "freight", "carrier", "truck", "warehouse",
    "delivery", "delay", "strike", "logistics", "shipping", "container", "transit"
]
KEYWORDS_GEOPOLITICAL = [
    "tariff", "sanction", "war", "conflict", "election", "government",
    "policy", "ban", "military", "border", "dispute", "trade war", "regulation"
]
KEYWORDS_WEATHER = [
    "storm", "hurricane", "flood", "typhoon", "weather", "rain",
    "drought", "snow", "freeze", "earthquake", "tsunami", "climate"
]
KEYWORDS_MARKET = [
    "stock", "investment", "shares", "equity", "acquisition", "acquire",
    "merger", "dividend", "revenue", "fiscal", "nasdaq", "nyse", "valuation"
]


def classify_risk(text: str) -> str:
    text_lower = text.lower()

    logistics_score = sum(1 for kw in KEYWORDS_LOGISTICS if kw in text_lower)
    geopolitical_score = sum(1 for kw in KEYWORDS_GEOPOLITICAL if kw in text_lower)
    weather_score = sum(1 for kw in KEYWORDS_WEATHER if kw in text_lower)
    market_score = sum(1 for kw in KEYWORDS_MARKET if kw in text_lower)

    max_score = max(logistics_score, geopolitical_score, weather_score, market_score)
    if max_score == 0:
        return "other"
    elif max_score == logistics_score:
        return "logistics"
    elif max_score == geopolitical_score:
        return "geopolitical"
    elif max_score == weather_score:
        return "weather"
    else:
        return "market"


@app.get("/")
@app.get("/health")
def health_check():
    return {"status": "UP", "service": "nlp-service"}


@app.post("/extract", response_model=ExtractResponse)
def extract_entities(request: ExtractRequest):
    if not request.text or request.text.strip() == "":
        return ExtractResponse(companies=[], locations=[], dates=[], category="other")

    companies = []
    locations = []
    dates = []

    if nlp:
        doc = nlp(request.text)
        for ent in doc.ents:
            if ent.label_ == "ORG":
                clean_text = ent.text.strip()
                if clean_text and clean_text not in companies:
                    companies.append(clean_text)
            elif ent.label_ in ["GPE", "LOC"]:
                clean_text = ent.text.strip()
                if clean_text and clean_text not in locations:
                    locations.append(clean_text)
            elif ent.label_ in ["DATE", "TIME"]:
                clean_text = ent.text.strip()
                if clean_text and clean_text not in dates:
                    dates.append(clean_text)

    category = classify_risk(request.text)

    return ExtractResponse(
        companies=companies,
        locations=locations,
        dates=dates,
        category=category
    )


@app.post("/embed", response_model=EmbedResponse)
def embed_text(request: EmbedRequest):
    if not request.text or request.text.strip() == "":
        return EmbedResponse(embedding=[0.0] * 384)
    if embedding_model:
        embedding = embedding_model.encode(request.text).tolist()
        return EmbedResponse(embedding=embedding)
    return EmbedResponse(embedding=[0.0] * 384)
