---
title: "What Are Embeddings?"
estimatedMinutes: 60
---

## What Are Embeddings?

Imagine you could turn any piece of text into a list of numbers that captures its **meaning**. Not just the words, but what the text is actually about. Two sentences that say similar things would produce similar numbers, even if they use completely different words.

That's what embeddings are. And they unlock a category of features that traditional keyword search can't touch: semantic search, recommendation systems, content clustering, and the foundation of Retrieval-Augmented Generation (RAG).

By the end of this lesson, you'll understand what embeddings are, why they matter, and how to think about them intuitively.

---

## The Problem: Computers Don't Understand Meaning

Computers work with numbers. They can tell you that the string "dog" and the string "cat" are different (different characters, different ASCII codes), but they have no idea that dogs and cats are both pets, both animals, and more related to each other than to "refrigerator."

Traditional search uses keyword matching:

```
Query: "How do I fix a broken pipe?"
Document 1: "Plumbing repair for broken pipes" → matches "broken" and "pipe"
Document 2: "Debugging Unix pipeline errors" → matches "pipe"
Document 3: "Repairing leaky water lines" → no match (different words, same concept)
```

Document 3 is clearly relevant, but keyword search misses it entirely because it uses different words. This is the vocabulary mismatch problem, and embeddings solve it.

---

## Embeddings: Text as Coordinates in Meaning Space

An embedding is a **vector** -- a list of numbers (typically 256 to 3072 numbers) that represents a piece of text in a high-dimensional space.

```python
# This is what an embedding looks like
embedding = [0.0023, -0.0142, 0.0089, 0.0312, -0.0067, ...]
# A list of, say, 1536 floating-point numbers
```

Think of it like GPS coordinates, but instead of 2 dimensions (latitude, longitude), you have 1536 dimensions. Each dimension captures some aspect of meaning -- though unlike GPS, individual dimensions don't have human-readable labels.

### The Key Property: Similar Meanings = Nearby Vectors

This is the magic. After a model produces embeddings:

```
"I love my golden retriever"  →  [0.12, -0.04, 0.08, ...]
"My dog is a golden retriever" →  [0.11, -0.03, 0.09, ...]  ← Very close!
"I enjoy Italian cuisine"     →  [0.45, 0.22, -0.31, ...]   ← Far away
```

The first two sentences are about the same thing (a golden retriever), so their vectors are close together. The third sentence is about food, so its vector is far away.

---

## How Embeddings Are Created

Embedding models are neural networks trained on massive amounts of text. During training, they learn to:

1. Read a piece of text (a word, sentence, or paragraph)
2. Compress its meaning into a fixed-size vector
3. Place semantically similar texts near each other in vector space

The training process uses pairs or groups of texts:
- **Positive pairs**: "The cat sat on the mat" and "A feline rested on the rug" should be close
- **Negative pairs**: "The cat sat on the mat" and "Stock prices rose 3% today" should be far apart

After billions of these examples, the model learns a general-purpose representation of language meaning.

### You Don't Train These Models Yourself

This is important: you use pre-trained embedding models via APIs. OpenAI, Google, Cohere, and others offer embedding endpoints. You send text, you get back a vector. The model does the hard work.

```
Your text  →  [Embedding API]  →  Vector of numbers
```

---

## Measuring Similarity: Cosine Similarity

Once you have two embeddings, how do you determine how similar they are? The most common method is **cosine similarity**.

Cosine similarity measures the angle between two vectors:
- **1.0** = identical direction (same meaning)
- **0.0** = perpendicular (unrelated)
- **-1.0** = opposite direction (opposite meaning, though this is rare in practice)

### The Math (Simplified)

```
cosine_similarity(A, B) = (A . B) / (|A| * |B|)
```

Where `A . B` is the dot product (multiply corresponding elements, sum them up) and `|A|` is the vector's magnitude (square root of sum of squares).

### In Code

```typescript
// utils/similarity.ts

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}
```

```python
# utils/similarity.py
import numpy as np

def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Calculate cosine similarity between two vectors."""
    a_arr = np.array(a)
    b_arr = np.array(b)

    dot_product = np.dot(a_arr, b_arr)
    magnitude_a = np.linalg.norm(a_arr)
    magnitude_b = np.linalg.norm(b_arr)

    if magnitude_a == 0 or magnitude_b == 0:
        return 0.0

    return float(dot_product / (magnitude_a * magnitude_b))
```

### What the Numbers Mean in Practice

```
"How do I reset my password?"
vs. "I forgot my password and need to change it"
→ Cosine similarity: 0.92  (very similar meaning)

"How do I reset my password?"
vs. "What's your return policy?"
→ Cosine similarity: 0.31  (different topics)

"How do I reset my password?"
vs. "The mitochondria is the powerhouse of the cell"
→ Cosine similarity: 0.08  (completely unrelated)
```

The threshold for "similar" depends on your use case, but generally:
- **> 0.8**: Very similar, probably about the same thing
- **0.5 - 0.8**: Related but different
- **< 0.5**: Mostly unrelated

---

## Real-World Use Cases

### 1. Semantic Search

Instead of matching keywords, embed the search query and find the most similar documents:

```
User searches: "error when deploying to production"

Keyword search finds: documents with "error", "deploying", "production"
Semantic search also finds: "deployment failure troubleshooting guide"
                            "CI/CD pipeline debugging steps"
                            "common production release issues"
```

### 2. Recommendation Systems

Find content similar to what a user has already engaged with:

```
User read: "Introduction to React Hooks"
Recommend: "Advanced useState Patterns"        (similarity: 0.87)
           "Understanding useEffect Lifecycle" (similarity: 0.84)
           "Vue 3 Composition API Guide"       (similarity: 0.72)
```

### 3. Duplicate Detection

Find near-duplicate support tickets, bug reports, or content:

```
New ticket: "App crashes when I click the save button"
Existing:   "Save button causes application to crash" (similarity: 0.95)
→ Flag as potential duplicate
```

### 4. Content Clustering

Group similar items together without manual categorization:

```
Cluster 1 (Authentication):
  - "How to implement OAuth2"
  - "JWT token best practices"
  - "Setting up SSO with SAML"

Cluster 2 (Databases):
  - "PostgreSQL indexing strategies"
  - "MongoDB query optimization"
  - "Database migration patterns"
```

### 5. RAG (Retrieval-Augmented Generation)

This is the big one. Give an LLM access to your specific data by finding relevant context:

```
User question: "What's our refund policy for digital products?"

1. Embed the question
2. Search your knowledge base for similar content
3. Find: "Digital Product Refund Policy v2.3" (similarity: 0.89)
4. Pass the policy document + question to the LLM
5. LLM answers using YOUR specific policy, not its general training data
```

We'll build this in Module 07.

---

## Embedding Dimensions: What Do They Mean?

Each number in an embedding vector represents some learned feature of the text. Unlike hand-crafted features, these dimensions are learned automatically and don't have clean labels.

However, researchers have found that certain directions in embedding space correspond to interpretable concepts:

```
Dimension cluster ~200-215: might capture "formality" of text
Dimension cluster ~800-820: might capture "technical complexity"
Dimension cluster ~1200-1210: might capture "sentiment"
```

You don't need to understand individual dimensions to use embeddings. Just know that the model has learned to encode meaning in a way that makes similar things close and different things far apart.

### Common Embedding Sizes

| Model | Dimensions | Notes |
|-------|-----------|-------|
| OpenAI text-embedding-3-small | 1536 | Good balance of quality and cost |
| OpenAI text-embedding-3-large | 3072 | Highest quality, more storage |
| Cohere embed-english-v3.0 | 1024 | Strong multilingual support |
| Google text-embedding-004 | 768 | Free tier available |

More dimensions generally means more nuance captured, but also more storage and computation. For most applications, 1536 dimensions work well.

---

## What Makes a Good Embedding?

Not all embeddings are equal. Embedding quality depends on:

### 1. Training Data

Models trained on diverse, high-quality text produce better general-purpose embeddings. Models trained on domain-specific text (medical papers, legal documents) produce better embeddings for those domains.

### 2. Input Length

Most embedding models have a maximum input length (e.g., 8191 tokens for OpenAI's models). If your text is longer, you need to chunk it. How you chunk matters:

```
Good chunking:
"React Hooks let you use state and other React features in function
 components. The useState hook returns a stateful value and a function
 to update it."
→ One coherent thought, one embedding

Bad chunking:
"React Hooks let you use state"  (chunk 1 - incomplete thought)
"and other React features in"    (chunk 2 - meaningless fragment)
"function components."           (chunk 3 - lacks context)
→ Three bad embeddings
```

### 3. Context

The same text can mean different things in different contexts:

```
"Python is great"
→ In a programming forum: about the programming language
→ In a pet store: about the snake
```

Modern embedding models handle this well because they consider the full input, but very short texts can be ambiguous.

---

## Embeddings vs. Traditional NLP

Before embeddings became mainstream, NLP used simpler representations:

### Bag of Words

```
"The cat sat on the mat" → {the: 2, cat: 1, sat: 1, on: 1, mat: 1}
```

Problems: no sense of meaning, word order lost, "The cat ate the dog" and "The dog ate the cat" are identical.

### TF-IDF

An improvement on bag of words that weights rare words higher:

```
"machine learning" in a CS paper → low weight (common in that corpus)
"machine learning" in a cooking blog → high weight (unusual)
```

Better, but still no semantic understanding.

### Word2Vec (2013)

The predecessor to modern embeddings. Each word gets its own vector:

```
king - man + woman ≈ queen   (famous example of learned relationships)
```

Revolutionary at the time, but limited to individual words, not sentences.

### Modern Sentence/Document Embeddings (2018+)

Models like BERT, then the transformer-based embedding models from OpenAI and others, embed entire passages with full context:

```
"I went to the bank to deposit money"
"I sat on the river bank to fish"
→ Different embeddings because "bank" means different things
```

This is what we use today.

---

## Mental Model: The Embedding Space

Picture a vast, high-dimensional space (we'll imagine 3D for simplicity):

```
                    Technical
                      ↑
                      |
                      |  "JavaScript closures"
                      |    "React useEffect"
                      |
                      |
 Negative ←───────────+───────────→ Positive
                      |
                      |
                      |    "Best pizza in Brooklyn"
                      |  "Italian restaurant reviews"
                      |
                      ↓
                   Casual
```

In reality, there are 1536+ dimensions, not 3. But the principle is the same: related content clusters together, and you can find similar content by looking at what's nearby.

---

## Limitations of Embeddings

Embeddings are powerful but not perfect:

### 1. They Compress Information

A 500-word paragraph gets compressed into 1536 numbers. Some nuance is inevitably lost. Long documents should be chunked and embedded separately.

### 2. They Reflect Training Data Biases

If the training data contains biases (and it does), the embeddings will too. "Doctor" might be closer to "man" than "woman" in some models.

### 3. They're Not Explanable

You can't easily explain why two texts are similar. Cosine similarity gives you a number, but not a reason. For applications where you need to justify why something was returned, combine embeddings with other signals.

### 4. They Don't Understand Negation Well

```
"I love this product"    →  embedding A
"I don't love this product" → embedding B
Similarity: often > 0.85 (very similar!)
```

The embeddings capture that both sentences are about loving a product, but miss the negation. For sentiment-critical applications, use additional classification.

---

## Key Takeaways

- **Embeddings turn text into vectors** (lists of numbers) that capture semantic meaning, not just keywords.
- **Similar meanings produce nearby vectors.** This is the foundational property that enables semantic search, recommendations, and RAG.
- **Cosine similarity** measures how similar two embeddings are, on a scale from -1 to 1. Above 0.8 is very similar; below 0.5 is mostly unrelated.
- **You don't build embedding models** -- you call APIs from OpenAI, Cohere, Google, etc. The models are pre-trained and ready to use.
- **Embeddings unlock features that keyword search can't**: finding semantically similar content even when different words are used.
- **They have limitations**: information compression, bias, poor negation handling, and a lack of explainability.

---

## Try It Yourself

1. **Starter exercise**: Without writing any code, list 5 pairs of sentences that should have high cosine similarity and 5 pairs that should have low similarity. Think about edge cases: same topic but different opinion, same words but different meaning.

2. **Intermediate exercise**: Implement the `cosineSimilarity` function in both TypeScript and Python. Test it with these vectors:
   - `[1, 0, 0]` and `[1, 0, 0]` (should be 1.0)
   - `[1, 0, 0]` and `[0, 1, 0]` (should be 0.0)
   - `[1, 1, 0]` and `[1, 0, 1]` (should be 0.5)

3. **Advanced exercise**: Think about how you'd build a "similar articles" feature for a blog. What text would you embed -- the title, the first paragraph, the entire article, or something else? What would the embedding pipeline look like? Write pseudo-code for the indexing step and the query step.

4. **Stretch goal**: Research the difference between OpenAI's `text-embedding-3-small` and `text-embedding-3-large`. When would you choose each one? What are the tradeoffs in cost, storage, and quality?
