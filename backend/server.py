# from fastapi import FastAPI
# from pydantic import BaseModel
# from typing import List, Dict, Any
# import chromadb
# from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
# import os
# import uuid
# from fastapi import UploadFile, File, Form
# from fastapi.responses import JSONResponse
# import shutil
# import spacy
# from sentence_transformers import SentenceTransformer, util
# import numpy as np
# from typing import List, Dict
# from bs4 import BeautifulSoup
# from fastapi.middleware.cors import CORSMiddleware

# # load models once
# nlp = spacy.load("en_core_web_sm")
# embedder = SentenceTransformer("all-MiniLM-L6-v2")

# # --- Chunking helpers (pulled from main.py, trimmed) ---
# def extract_tags(text: str, top_n: int = 3) -> List[str]:
#     doc = nlp(text)
#     tags = [token.lemma_ for token in doc if token.pos_ == 'NOUN']
#     return list(dict.fromkeys(tags))[:top_n]

# def generate_title(text: str) -> str:
#     doc = nlp(text)
#     if doc.sents:
#         first_sent = next(doc.sents).text.strip()
#         return first_sent[:80]
#     return " ".join(text.split()[:8])

# def generate_description(text: str) -> str:
#     doc = nlp(text)
#     sents = list(doc.sents)
#     return " ".join([s.text.strip() for s in sents[:2]])

# def chunk_text_semantic(text: str, max_chunk_size: int = 500) -> List[Dict]:
#     paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
#     if not paragraphs:
#         paragraphs = [text]
#     embeddings = embedder.encode(paragraphs)
#     chunks = []
#     current_chunk = ''
#     current_embeds = []
#     page_index = 1
#     for i, para in enumerate(paragraphs):
#         if not current_chunk:
#             current_chunk = para
#             current_embeds = [embeddings[i]]
#         else:
#             sim = util.cos_sim(np.mean(current_embeds, axis=0), embeddings[i]).item()
#             if len(current_chunk) < max_chunk_size and sim > 0.6:
#                 current_chunk += "\n" + para
#                 current_embeds.append(embeddings[i])
#             else:
#                 chunks.append({
#                     "id": str(uuid.uuid4()),
#                     "title": generate_title(current_chunk),
#                     "description": generate_description(current_chunk),
#                     "tags": extract_tags(current_chunk),
#                     "pageIndex": page_index,
#                     "content": current_chunk,
#                 })
#                 page_index += 1
#                 current_chunk = para
#                 current_embeds = [embeddings[i]]
#     if current_chunk:
#         chunks.append({
#             "id": str(uuid.uuid4()),
#             "title": generate_title(current_chunk),
#             "description": generate_description(current_chunk),
#             "tags": extract_tags(current_chunk),
#             "pageIndex": page_index,
#             "content": current_chunk,
#         })
#     return chunks

# def extract_text(content: str, content_type: str = 'text/plain') -> str:
#     if content_type == "text/html":
#         soup = BeautifulSoup(content, "html.parser")
#         return soup.get_text(separator="\n")
#     return content

# # Persistent local DB (folder)
# client = chromadb.PersistentClient(path="./chroma_db")

# # Use the SAME model you used for document embeddings
# embedding_fn = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

# # Get collections lazily
# def get_collection(name: str):
#     return client.get_or_create_collection(name=name, embedding_function=embedding_fn)

# app = FastAPI()

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# class SearchBody(BaseModel):
#     query: str
#     collection: str  # "policy" | "domain" | "docs"
#     k: int = 4

# @app.get("/health")
# def health():
#     return {"ok": True}

# @app.post("/search")
# def search(body: SearchBody):
#     col = get_collection(body.collection)
#     res = col.query(
#         query_texts=[body.query],
#         n_results=body.k,
#         include=["documents", "metadatas", "distances"],
#         # include=["documents", "ids", "metadatas", "distances"],
#     )
#     # Chroma returns arrays-of-arrays; flatten to a simple list
#     out = []
#     for i in range(len(res["ids"][0])):
#         out.append({
#             "id": res["ids"][0][i],
#             "content": res["documents"][0][i],
#             "metadata": res["metadatas"][0][i] if res.get("metadatas") else {},
#             "distance": res["distances"][0][i] if res.get("distances") else None,
#         })
#     return {"results": out}


# @app.post("/upload")
# async def upload_file(
#     file: UploadFile = File(...),
#     collection: str = Form("default")
# ):
#     try:
#         raw = await file.read()
#         text = raw.decode("utf-8", errors="ignore")
#         # guess type
#         content_type = "text/html" if file.filename.endswith(".html") else "text/plain"
#         cleaned = extract_text(text, content_type)

#         # semantic chunking
#         chunks = chunk_text_semantic(cleaned)

#         # store into Chroma
#         col = get_collection(collection)
#         col.add(
#             ids=[c["id"] for c in chunks],
#             documents=[c["content"] for c in chunks],
#             metadatas=chunks
#         )

#         return JSONResponse({"status": "ok", "chunks_added": len(chunks)})
#     except Exception as e:
#         return JSONResponse({"status": "error", "detail": str(e)}, status_code=500)

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction
import spacy
from sentence_transformers import SentenceTransformer, util
import numpy as np
import uuid
from bs4 import BeautifulSoup
import pdfplumber
import io

# --- Models ---
nlp = spacy.load("en_core_web_sm")
embedder = SentenceTransformer("all-MiniLM-L6-v2")

# --- Helpers ---
def extract_tags(text: str, top_n: int = 3) -> str:
    """Return tags as a comma-separated string (Chroma-safe)."""
    doc = nlp(text)
    tags = [token.lemma_ for token in doc if token.pos_ == 'NOUN']
    uniq = list(dict.fromkeys(tags))[:top_n]
    return ", ".join(uniq)  # ✅ return string instead of list

def generate_title(text: str) -> str:
    doc = nlp(text)
    if doc.sents:
        return next(doc.sents).text.strip()[:80]
    return " ".join(text.split()[:8])

def generate_description(text: str) -> str:
    doc = nlp(text)
    sents = list(doc.sents)
    return " ".join([s.text.strip() for s in sents[:2]])

def chunk_text_semantic(text: str, max_chunk_size: int = 300) -> List[Dict]:
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    if not paragraphs:
        paragraphs = [text]
    embeddings = embedder.encode(paragraphs)
    chunks = []
    current_chunk = ''
    current_embeds = []
    page_index = 1
    for i, para in enumerate(paragraphs):
        if not current_chunk:
            current_chunk = para
            current_embeds = [embeddings[i]]
        else:
            sim = util.cos_sim(np.mean(current_embeds, axis=0), embeddings[i]).item()
            if len(current_chunk) < max_chunk_size and sim > 0.4:
                current_chunk += "\n" + para
                current_embeds.append(embeddings[i])
            else:
                chunks.append({
                    "id": str(uuid.uuid4()),
                    "title": generate_title(current_chunk),
                    "description": generate_description(current_chunk),
                    "tags": extract_tags(current_chunk),  # ✅ string now
                    "pageIndex": page_index,
                    "content": current_chunk,
                })
                page_index += 1
                current_chunk = para
                current_embeds = [embeddings[i]]
    if current_chunk:
        chunks.append({
            "id": str(uuid.uuid4()),
            "title": generate_title(current_chunk),
            "description": generate_description(current_chunk),
            "tags": extract_tags(current_chunk),  # ✅ string now
            "pageIndex": page_index,
            "content": current_chunk,
        })
    print(chunks)
    return chunks

def extract_text(raw: bytes, filename: str) -> str:
    if filename.endswith(".pdf"):
        text = ""
        with pdfplumber.open(io.BytesIO(raw)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
    elif filename.endswith(".html"):
        soup = BeautifulSoup(raw.decode("utf-8", errors="ignore"), "html.parser")
        return soup.get_text(separator="\n")
    else:  # default: treat as txt
        return raw.decode("utf-8", errors="ignore")

# --- DB setup ---
client = chromadb.PersistentClient(path="./chroma_db")
embedding_fn = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

def get_collection(name: str):
    return client.get_or_create_collection(name=name, embedding_function=embedding_fn)

# --- FastAPI app ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SearchBody(BaseModel):
    query: str
    collection: str
    k: int = 4

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/search")
def search(body: SearchBody):
    col = get_collection(body.collection)
    res = col.query(
        query_texts=[body.query],
        n_results=body.k,
        include=["documents", "metadatas", "distances"],
        # include=["documents", "ids", "metadatas", "distances"],
    )
    out = []
    for i in range(len(res["ids"][0])):
        out.append({
            "id": res["ids"][0][i],
            "content": res["documents"][0][i],
            "metadata": res["metadatas"][0][i] if res.get("metadatas") else {},
            "distance": res["distances"][0][i] if res.get("distances") else None,
        })
    return {"results": out}

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    collection: str = Form("default")
):
    try:
        raw = await file.read()
        cleaned = extract_text(raw, file.filename)
        chunks = chunk_text_semantic(cleaned)

        col = get_collection(collection)
        col.add(
            ids=[c["id"] for c in chunks],
            documents=[c["title"] + " " + c["description"] + " " + c["content"] for c in chunks],
            # documents=[c["content"] for c in chunks],
            metadatas=chunks  # ✅ tags are safe now
        )

        return JSONResponse({"status": "ok", "chunks_added": len(chunks)})
    except Exception as e:
        return JSONResponse({"status": "error", "detail": str(e)}, status_code=500)
