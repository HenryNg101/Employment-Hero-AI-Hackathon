# Employment Hero Copilot — Supporting Documentation

### 🔧 Setup & Project Overview

This prototype is a **multi-agent Copilot** designed to help employees and HR teams by answering policy questions, assisting with onboarding/domain knowledge, and digesting messy documentation.

#### Project Structure

* **Frontend** → Next.js + Typescript chat app (supports file upload)
* **Backend** → FastAPI Python server (handles agents, embeddings, and retrieval)
* **Vector Database** → ChromaDB for document storage & semantic search
* **LLM Engine** → Ollama (tested with `llama3.1:8b` model)
* **Embedding Model** → Sentence-transformers from HuggingFace for semantic chunking
* **Auth** → AWS Amplify for authentication

#### Local Setup

1. Clone the repository
2. Start backend:

   ```bash
   cd backend 

   # Pre-load pre-processed mock chunks information from json files
   python ingest_chunks.py docs ./docs_chunks.json
   python ingest_chunks.py domain ./domain_chunks.json
   python ingest_chunks.py policy ./policy_chunks.json

   # Start the server
   uvicorn main:app --reload  
   ```
3. Start frontend:

   ```bash
   cd frontend  
   npm install  
   npm run dev  
   ```
4. Ensure Ollama is running locally with the chosen model pulled (e.g., `ollama pull llama3.1:8b`)

---

### 🧠 Technical Flow

1. **User Uploads a File** → Document is parsed into semantic chunks (sentence-transformer).
2. **Chunks Stored in ChromaDB** → Each chunk gets embedded for fast retrieval.
3. **User Asks a Question** → Backend queries ChromaDB for relevant chunks.
4. **Ollama LLM** → Uses retrieved chunks as context to generate human-like answers.
5. **Response** → Sent back to the frontend chat app.

---

### ⚡ Challenges Faced

* **Performance Bottleneck** → Semantic chunking and embedding large files is slow. Using `llama3.1:8b` on Ollama adds additional latency.
* **File Upload Bugs** → Fake chunks worked fine, but real uploaded documents weren’t always processed correctly (retrieval gaps).
* **UI/UX** → Chat UI is functional but minimal — more like a skeleton prototype than polished product.
* **Limited Time** → Hackathon constraints meant some features (multi-agent switching, advanced insights) are only partially implemented or mocked.

---

### 🔮 Future Work

* **Better Chunking** → Explore adaptive chunk sizes and hybrid approaches (semantic + structural) to improve retrieval accuracy.
* **Model Optimization** → Try smaller, faster LLMs (e.g., `llama3.1:3b`, `mistral`, or OpenAI API if budget allows) to improve speed and responsiveness.
* **Multi-Agent Coordination** → Extend current system with a few agents chat into a true multi-agent system where different specialists collaborate (policy, docs, domain knowledge).
* **Polished UX** → Add styling, persona switching (choose “Policy Copilot” or “Docs Copilot”), and smoother demo experience.
* **Cost Efficiency** → Experiment with hybrid local + cloud inference for balance between speed and cost.

---

### 🎯 Key Takeaway

Even in its early state, the Copilot **proves the feasibility of multi-agent AI inside Employment Hero’s ecosystem**. With further refinement, it can scale from a working prototype into a robust AI assistant that reduces HR overhead, accelerates onboarding, and supports employees 24/7.