---
title: "RAG with LlamaIndex and LangChain"
estimatedMinutes: 50
---

# RAG with LlamaIndex and LangChain

You just built a RAG pipeline from scratch: chunking, embedding, vector search, prompt assembly, generation. You understand every piece. Now it's time to see how the two most popular frameworks handle the same pipeline, because in a professional setting, you'll rarely build RAG from zero.

LlamaIndex and LangChain are the dominant RAG frameworks in the ecosystem. Job postings list them constantly. But they solve the problem from different angles. LlamaIndex is data-first: it was built specifically for connecting LLMs to your data. LangChain is chain-first: it was built for composing LLM operations into sequences. Understanding both, and knowing when to reach for each, is what makes you effective on a team that's already using one of them.

---

## Why Use a Framework?

Your from-scratch RAG pipeline works. So why add a dependency?

| Concern | From Scratch | Framework |
|---------|-------------|-----------|
| Chunking | You wrote a markdown splitter | Built-in splitters for PDF, HTML, code, tables, 20+ formats |
| Embedding | Manual API calls + batching | Automatic batching, caching, model swapping |
| Vector store | Raw Supabase/pgvector SQL | Unified interface across 40+ vector stores |
| Retrieval | Your hybrid search function | Built-in hybrid, reranking, query expansion, metadata filtering |
| Prompt assembly | Manual string formatting | Templated prompts with variable injection |
| Evaluation | Your custom eval script | Integrated eval with standard metrics |

The answer isn't "always use a framework." It's: **use a framework when the built-in integrations save you time, and go custom when you need control the framework doesn't give you.**

---

## LlamaIndex: Data-First RAG

LlamaIndex (formerly GPT Index) was purpose-built for RAG. Its mental model is: **your data is a first-class citizen**. You load documents, build an index, and query it.

### Core Concepts

```
Documents → Nodes → Index → Query Engine → Response
```

- **Documents**: Raw data (files, API responses, database rows)
- **Nodes**: Chunks with metadata (LlamaIndex's version of your chunks)
- **Index**: The searchable data structure (vector index, keyword index, etc.)
- **Query Engine**: Orchestrates retrieval + generation
- **Response Synthesizer**: Controls how retrieved context becomes an answer

### Your RAG Pipeline in LlamaIndex (Python)

```python
# pip install llama-index llama-index-vector-stores-supabase

from llama_index.core import (
    SimpleDirectoryReader,
    VectorStoreIndex,
    Settings,
)
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

# Configure models globally
Settings.llm = OpenAI(model="gpt-4o-mini", temperature=0.2)
Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")

# Step 1: Load documents (replaces your file reading + chunking)
documents = SimpleDirectoryReader("./docs").load_data()
print(f"Loaded {len(documents)} documents")

# Step 2: Build the index (replaces your embedding + storage)
index = VectorStoreIndex.from_documents(documents)

# Step 3: Query (replaces your retrieval + prompt + generation)
query_engine = index.as_query_engine(similarity_top_k=5)
response = query_engine.query("How do I set up the project?")

print(response.response)
print(f"\nSources: {len(response.source_nodes)}")
for node in response.source_nodes:
    print(f"  - {node.metadata.get('file_name', 'unknown')} (score: {node.score:.3f})")
```

That's it. Five lines replace your entire chunking, embedding, storage, retrieval, and generation pipeline. LlamaIndex handles the defaults for everything you built manually.

### Your RAG Pipeline in LlamaIndex (JavaScript)

```javascript
// npm install llamaindex

import {
  SimpleDirectoryReader,
  VectorStoreIndex,
  Settings,
  OpenAI,
  OpenAIEmbedding,
} from 'llamaindex';

// Configure models
Settings.llm = new OpenAI({ model: 'gpt-4o-mini', temperature: 0.2 });
Settings.embedModel = new OpenAIEmbedding({ model: 'text-embedding-3-small' });

// Load, index, query
const documents = await new SimpleDirectoryReader().loadData('./docs');
const index = await VectorStoreIndex.fromDocuments(documents);
const queryEngine = index.asQueryEngine({ similarityTopK: 5 });

const response = await queryEngine.query('How do I set up the project?');
console.log(response.message.content);
```

### Customizing LlamaIndex

The defaults are convenient, but you'll want to customize. Here's how to swap in your own chunking strategy and vector store:

```python
from llama_index.core.node_parser import MarkdownNodeParser
from llama_index.core import StorageContext
from llama_index.vector_stores.supabase import SupabaseVectorStore

# Custom chunking: use markdown-aware splitting (like your chunker.js)
parser = MarkdownNodeParser(chunk_size=800, chunk_overlap=150)
nodes = parser.get_nodes_from_documents(documents)

# Custom vector store: use your existing Supabase setup
vector_store = SupabaseVectorStore(
    postgres_connection_string="postgresql://...",
    collection_name="docs",
)
storage_context = StorageContext.from_defaults(vector_store=vector_store)

# Build index with your customizations
index = VectorStoreIndex(
    nodes,
    storage_context=storage_context,
)
```

### Adding Hybrid Search in LlamaIndex

Remember the hybrid search function you wrote in SQL? LlamaIndex has built-in support:

```python
from llama_index.core.retrievers import QueryFusionRetriever
from llama_index.retrievers.bm25 import BM25Retriever

# Create two retrievers
vector_retriever = index.as_retriever(similarity_top_k=5)
bm25_retriever = BM25Retriever.from_defaults(
    nodes=nodes,
    similarity_top_k=5,
)

# Fuse them with Reciprocal Rank Fusion
hybrid_retriever = QueryFusionRetriever(
    retrievers=[vector_retriever, bm25_retriever],
    num_queries=1,  # No query expansion, just fusion
    similarity_top_k=5,
)

# Use the hybrid retriever in your query engine
from llama_index.core.query_engine import RetrieverQueryEngine

query_engine = RetrieverQueryEngine.from_args(
    retriever=hybrid_retriever,
    llm=Settings.llm,
)
```

---

## LangChain: Chain-First RAG

LangChain approaches the problem differently. Instead of centering on your data, it centers on **composable operations** called chains. RAG is one chain pattern among many.

### Core Concepts

```
Document Loaders → Text Splitters → Embeddings → Vector Store → Retriever → Chain → Output
```

- **Document Loaders**: Read data from sources (files, URLs, databases)
- **Text Splitters**: Chunk documents (recursive, markdown, code-aware)
- **Embeddings**: Generate vectors (OpenAI, Cohere, local models)
- **Vector Stores**: Store and search vectors (Supabase, Pinecone, Chroma)
- **Retrievers**: Find relevant documents given a query
- **Chains**: Compose multiple operations into a pipeline

### Your RAG Pipeline in LangChain (Python)

```python
# pip install langchain langchain-openai langchain-community

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import SupabaseVectorStore
from langchain.chains import RetrievalQA
from supabase import create_client

# Step 1: Load documents
loader = DirectoryLoader("./docs", glob="**/*.md", loader_cls=TextLoader)
documents = loader.load()
print(f"Loaded {len(documents)} documents")

# Step 2: Split into chunks
splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=150,
    separators=["\n\n", "\n", ". ", " "],
)
chunks = splitter.split_documents(documents)
print(f"Split into {len(chunks)} chunks")

# Step 3: Embed and store
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)

vector_store = SupabaseVectorStore.from_documents(
    chunks,
    embeddings,
    client=supabase_client,
    table_name="docs",
    query_name="match_documents",
)

# Step 4: Build the RAG chain
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=vector_store.as_retriever(search_kwargs={"k": 5}),
    return_source_documents=True,
)

# Step 5: Query
result = qa_chain.invoke({"query": "How do I set up the project?"})
print(result["result"])
for doc in result["source_documents"]:
    print(f"  - {doc.metadata.get('source', 'unknown')}")
```

### Your RAG Pipeline in LangChain (JavaScript)

```javascript
// npm install langchain @langchain/openai @langchain/community

import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { DirectoryLoader } from 'langchain/document_loaders/fs/directory';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { RetrievalQAChain } from 'langchain/chains';

// Load and split
const loader = new DirectoryLoader('./docs', { '.md': (path) => new TextLoader(path) });
const docs = await loader.load();
const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 800, chunkOverlap: 150 });
const chunks = await splitter.splitDocuments(docs);

// Embed and store (in-memory for simplicity)
const embeddings = new OpenAIEmbeddings({ modelName: 'text-embedding-3-small' });
const vectorStore = await MemoryVectorStore.fromDocuments(chunks, embeddings);

// Build chain and query
const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0.2 });
const chain = RetrievalQAChain.fromLLM(llm, vectorStore.asRetriever({ k: 5 }));

const result = await chain.invoke({ query: 'How do I set up the project?' });
console.log(result.text);
```

### LangChain Expression Language (LCEL)

LangChain's newer approach uses LCEL to compose operations with the pipe (`|`) operator. This is the recommended way to build chains:

```python
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# Define the prompt template
prompt = ChatPromptTemplate.from_template("""Answer the question based only on the following context:

{context}

Question: {question}

Answer with source citations.""")

# Build the chain with LCEL
retriever = vector_store.as_retriever(search_kwargs={"k": 5})

def format_docs(docs):
    return "\n\n---\n\n".join(
        f"[{i+1}] ({doc.metadata.get('source', 'unknown')})\n{doc.page_content}"
        for i, doc in enumerate(docs)
    )

rag_chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | llm
    | StrOutputParser()
)

# Query
answer = rag_chain.invoke("How do I set up the project?")
print(answer)
```

LCEL makes the data flow explicit. You can see exactly what happens at each step, and you can swap out any component without changing the rest.

---

## LlamaIndex vs. LangChain: When to Use Which

| Factor | LlamaIndex | LangChain |
|--------|-----------|-----------|
| **Best for** | Data-heavy RAG applications | Multi-step LLM workflows beyond just RAG |
| **Mental model** | "Index your data, query it" | "Compose operations into chains" |
| **RAG out of the box** | Excellent. Purpose-built for it | Good, but requires more assembly |
| **Beyond RAG** | Limited. Adding agents/chains feels bolted on | Strong. Agents, chains, tools, memory are first-class |
| **Document loaders** | 100+ loaders via LlamaHub | 80+ built-in loaders |
| **Chunking** | Good defaults, fewer options | More splitter options (code, markdown, recursive, semantic) |
| **Evaluation** | Built-in eval with `RagEvaluator` | Separate library (LangSmith / ragas) |
| **Learning curve** | Lower for RAG. Higher abstractions | Higher overall. More concepts to learn |
| **Community** | Smaller but focused | Larger, more tutorials and examples |
| **Job postings** | Common in data/ML-heavy roles | Very common across all AI engineering roles |

**Rule of thumb:**
- If your app is primarily about querying your own data (docs, knowledge base, support articles), start with **LlamaIndex**.
- If your app chains multiple LLM operations together (RAG + summarization + classification + tool use), start with **LangChain**.
- If you're applying for jobs, **learn both** but go deeper on LangChain since it appears in more job postings.

---

## The Framework Trap

A word of caution. Frameworks evolve fast. LangChain's API changed significantly between v0.1 and v0.2. LlamaIndex went through a major restructuring. If you build your entire app on framework abstractions without understanding the underlying concepts, you'll struggle when:

1. The framework makes a breaking API change
2. You need behavior the framework doesn't support
3. You need to debug a retrieval issue buried under three layers of abstraction

That's why this course taught you from scratch first. You know what chunking, embedding, retrieval, and prompt assembly actually do. Now when you use `VectorStoreIndex.from_documents()`, you understand the 200 lines of code it replaces.

**The best engineers use frameworks strategically**: leverage them for boilerplate (document loading, vector store integration, standard retrieval), and go custom for the parts that differentiate your product (custom chunking logic, domain-specific reranking, specialized evaluation).

---

## Key Takeaways

1. **LlamaIndex** is purpose-built for RAG. It gets you from documents to a working query engine in ~5 lines. Best for data-centric applications.

2. **LangChain** is a general-purpose LLM framework. RAG is one of many patterns it supports. Best when your app goes beyond simple retrieval.

3. **LCEL** (LangChain Expression Language) is the modern way to compose LangChain operations. Learn it. It makes data flow explicit and components swappable.

4. **Both frameworks support hybrid search**, custom chunking, and multiple vector stores. The concepts you learned building from scratch map directly to framework components.

5. **Frameworks don't replace understanding.** They accelerate development when you know what's happening underneath. Use them for integrations and boilerplate, go custom for differentiation.

---

## Try It Yourself

Take your "Ask My Docs" project from this module and rebuild the ingestion + query pipeline using either LlamaIndex or LangChain:

1. Replace your `chunker.js` and `ingest.js` with the framework's document loader and splitter
2. Replace your `rag.js` query pipeline with the framework's retriever and query engine
3. Keep your evaluation script and run it against both implementations
4. Compare: Which produces better answers? Which is easier to modify? Which would you choose for a production app?

The goal isn't to pick a winner. It's to understand the tradeoffs so you can make an informed choice on a real project.
