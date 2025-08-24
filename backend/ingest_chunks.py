import json, sys
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

# Usage: python ingest_chunks.py policy ./path/to/policy_chunks.json
collection_name = sys.argv[1]   # "policy" | "domain" | "docs"
json_path       = sys.argv[2]

client = chromadb.PersistentClient(path="./chroma_db")
embedding_fn = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
col = client.get_or_create_collection(name=collection_name, embedding_function=embedding_fn)

with open(json_path, "r", encoding="utf-8") as f:
    chunks = json.load(f)

ids = [c["id"] for c in chunks]
docs = [c["content"] for c in chunks]
metas = [{"title": c.get("title"), "pageIndex": c.get("pageIndex"), "documentId": c.get("documentId")} for c in chunks]

# If your chunks were already embedded with the SAME model, it's fine to add without embeddings;
# queries will still use the same embedding function.
col.add(ids=ids, documents=docs, metadatas=metas)

print(f"✅ Ingested {len(ids)} chunks into '{collection_name}'")
