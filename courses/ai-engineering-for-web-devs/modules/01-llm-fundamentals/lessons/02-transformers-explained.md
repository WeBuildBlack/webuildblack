---
title: "Transformers Explained for Web Developers"
estimatedMinutes: 60
---

# Transformers Explained for Web Developers

In the last lesson, we said the Transformer architecture changed everything. Now let's understand why. You don't need to implement a Transformer from scratch (unless you want to -- respect), but understanding the core concepts will make you a better AI engineer. It's the difference between using a database and understanding indexing -- you can do either, but the second one makes you dangerous.

We're going to explain Transformers using concepts you already know: key-value lookups, weighted averages, and function composition. No linear algebra required.

---

## Why Transformers Matter to You

Before Transformers, language models processed text **sequentially** -- one word at a time, left to right. Imagine trying to understand a 10,000-word document by reading it through a tiny window that only shows one word, trying to remember everything important in a fixed-size memory buffer. That was the old approach (RNNs and LSTMs), and it was slow and forgetful.

Transformers process **all tokens simultaneously**. Every word can "look at" every other word in the input. This parallel processing is why:

- LLMs can understand long documents
- Training can run on hundreds of GPUs in parallel
- Models can capture complex relationships between distant parts of the text

As a web developer, here's the analogy: RNNs were like processing an array with a `for` loop and a single accumulator variable. Transformers are like using `Promise.all()` -- everything runs at once, and the results are combined intelligently.

---

## The Core Idea: Attention

The single most important concept in Transformers is **attention**. Here's the intuition.

### The Dictionary Lookup Analogy

You know how a JavaScript `Map` or Python `dict` works:

```javascript
const capitals = new Map([
  ['France', 'Paris'],
  ['Japan', 'Tokyo'],
  ['Nigeria', 'Abuja'],
]);

// Exact lookup: give me the value for this exact key
console.log(capitals.get('France')); // 'Paris'
```

Now imagine a **fuzzy dictionary** where your query doesn't have to match a key exactly. Instead, it checks how similar your query is to every key, and returns a weighted blend of all values:

```javascript
// Conceptual "fuzzy" lookup
function fuzzyLookup(query, dictionary) {
  const results = [];

  for (const [key, value] of dictionary) {
    const similarity = computeSimilarity(query, key); // 0 to 1
    results.push({ value, weight: similarity });
  }

  // Return weighted combination of all values
  return weightedAverage(results);
}

// query: "European country"
// "France" → high similarity → Paris gets high weight
// "Japan" → low similarity → Tokyo gets low weight
// "Nigeria" → low similarity → Abuja gets low weight
// Result: mostly "Paris" with tiny influences from others
```

**That's attention.** Every token in the input creates a query ("what am I looking for?"), and every token also serves as a key-value pair ("here's what I am, and here's my information"). The model learns which tokens should pay attention to which other tokens.

### Attention in Action

Consider this sentence:

> "The developer pushed the code to the **repository** because **it** needed to be reviewed."

What does "it" refer to? The code? The repository? A human reader knows "it" refers to "the code" based on meaning. An attention mechanism figures this out by computing high attention weights between "it" and "code":

```
Token: "it"
  → attention to "developer": 0.05
  → attention to "pushed":    0.02
  → attention to "code":      0.71  ← HIGH - this is what "it" refers to
  → attention to "repository": 0.15
  → attention to "reviewed":   0.07
```

The model learns these attention patterns during training, across billions of examples.

### Self-Attention: The Technical Version

In a Transformer, each token generates three vectors:

- **Query (Q)**: "What am I looking for?"
- **Key (K)**: "What do I contain?"
- **Value (V)**: "What information do I provide?"

The attention score between two tokens is the dot product of one token's Query with another token's Key. These scores get normalized (via softmax) into weights, and the output is a weighted sum of Values.

Here's a simplified implementation:

```python
import numpy as np

def self_attention(tokens_embedded):
    """
    Simplified self-attention mechanism.
    tokens_embedded: matrix of shape (num_tokens, embedding_dim)
    """
    # In reality, these are learned linear transformations
    # For illustration, we'll use the embeddings directly
    Q = tokens_embedded  # Queries
    K = tokens_embedded  # Keys
    V = tokens_embedded  # Values

    # Compute attention scores: how much should each token
    # attend to every other token?
    scores = Q @ K.T  # Shape: (num_tokens, num_tokens)

    # Scale by square root of dimension (prevents huge numbers)
    d_k = K.shape[-1]
    scores = scores / np.sqrt(d_k)

    # Softmax: convert scores to probabilities (0-1, sum to 1)
    weights = softmax(scores)  # Each row sums to 1

    # Weighted sum of values
    output = weights @ V

    return output
```

```javascript
// The same concept in JavaScript
function selfAttention(tokensEmbedded) {
  const numTokens = tokensEmbedded.length;
  const dim = tokensEmbedded[0].length;

  // Compute attention scores
  const scores = [];
  for (let i = 0; i < numTokens; i++) {
    scores[i] = [];
    for (let j = 0; j < numTokens; j++) {
      // Dot product between token i's query and token j's key
      let score = 0;
      for (let d = 0; d < dim; d++) {
        score += tokensEmbedded[i][d] * tokensEmbedded[j][d];
      }
      scores[i][j] = score / Math.sqrt(dim);
    }
  }

  // Softmax each row (convert to probabilities)
  const weights = scores.map(row => softmax(row));

  // Weighted sum of values
  const output = weights.map(row =>
    row.reduce((sum, w, j) =>
      sum.map((val, d) => val + w * tokensEmbedded[j][d]),
      new Array(dim).fill(0)
    )
  );

  return output;
}
```

Don't worry if the math feels dense. The key takeaway is: **attention lets every token "see" every other token and decide which ones are relevant.**

---

## Multi-Head Attention: Looking at Things from Multiple Angles

A single attention mechanism looks at the input from one perspective. But language has multiple simultaneous relationships -- syntax, semantics, coreference, entity type, and more.

**Multi-head attention** runs multiple attention mechanisms in parallel, each learning to look for different types of relationships:

```
Head 1: "Who is the subject of this verb?"
Head 2: "What adjective modifies this noun?"
Head 3: "What does this pronoun refer to?"
Head 4: "What's the topic of this paragraph?"
... (typically 32-128 heads in modern models)
```

Think of it like code review with multiple reviewers. Each reviewer focuses on different things -- one checks logic, another checks style, another checks security. The combined feedback is richer than any single review.

```javascript
// Conceptual multi-head attention
function multiHeadAttention(tokens, numHeads) {
  const headOutputs = [];

  for (let h = 0; h < numHeads; h++) {
    // Each head has its own learned Q, K, V projections
    const Q = linearProjection(tokens, `head_${h}_query`);
    const K = linearProjection(tokens, `head_${h}_key`);
    const V = linearProjection(tokens, `head_${h}_value`);

    // Each head computes attention independently
    headOutputs.push(attention(Q, K, V));
  }

  // Concatenate all heads and project back
  return linearProjection(concatenate(headOutputs), 'output');
}
```

---

## The Full Transformer Block

A Transformer is built by stacking identical blocks. Each block has two main components:

### 1. Multi-Head Self-Attention

"Let every token look at every other token, from multiple perspectives."

### 2. Feed-Forward Network (FFN)

"Now that each token has gathered information from other tokens, process it through a neural network to extract higher-level features."

The FFN is a simple two-layer neural network applied to each token independently. Think of it as a `map()` operation:

```javascript
// Conceptual Transformer block
function transformerBlock(tokens) {
  // Step 1: Self-attention (tokens interact with each other)
  let attended = multiHeadAttention(tokens);
  attended = layerNorm(add(tokens, attended)); // Residual connection + normalization

  // Step 2: Feed-forward (each token processed independently)
  let processed = feedForward(attended);
  processed = layerNorm(add(attended, processed)); // Residual connection + normalization

  return processed;
}

// A full Transformer stacks many of these blocks
function transformer(inputTokens) {
  let hidden = embed(inputTokens); // Convert tokens to vectors
  hidden = addPositionalEncoding(hidden); // Add position information

  // Stack N blocks (large models like Llama 3 70B have 80 layers)
  for (let layer = 0; layer < NUM_LAYERS; layer++) {
    hidden = transformerBlock(hidden);
  }

  return hidden; // Rich, contextual representations
}
```

### Residual Connections: The Skip Wires

Notice the `add(tokens, attended)` step. This is a **residual connection** -- the input is added to the output of each sub-layer. It's like a skip connection in a circuit. Without it, signals would degrade as they pass through dozens of layers. With it, gradients flow smoothly during training.

Web developer analogy: it's like middleware in Express.js that can modify the request but also passes the original through:

```javascript
// Middleware pattern ≈ residual connection
app.use((req, res, next) => {
  req.enrichedData = processRequest(req); // Add new information
  // But req still has all its original properties too
  next();
});
```

---

## Positional Encoding: How Transformers Know Word Order

Here's a subtle problem: attention treats input as a **set**, not a sequence. The sentence "dog bites man" and "man bites dog" would look identical to pure attention because the same three tokens are present.

**Positional encodings** solve this by adding position information to each token's embedding before it enters the Transformer:

```javascript
// Conceptual positional encoding
function addPositions(tokenEmbeddings) {
  return tokenEmbeddings.map((embedding, position) => {
    const positionVector = computePositionVector(position);
    // Add position information to the token's embedding
    return embedding.map((val, i) => val + positionVector[i]);
  });
}
```

The original Transformer paper used sine and cosine functions at different frequencies. Modern models often use **learned** positional encodings or techniques like **Rotary Position Embeddings (RoPE)** that can generalize to longer sequences.

This is why **position in your prompt matters**. The model knows where things are in the input, and important information at the beginning or end of a prompt is often processed differently than information buried in the middle.

---

## Decoder-Only vs Encoder-Decoder

There are two main Transformer architectures you'll encounter:

### Encoder-Decoder (Original Transformer, T5)

- **Encoder**: Processes the full input, allowing every token to attend to every other token (bidirectional)
- **Decoder**: Generates output one token at a time, only attending to previous tokens and the encoder's output
- **Used for**: Translation, summarization (input and output are distinct)

### Decoder-Only (GPT, Claude, Llama)

- Only a decoder, which processes input and generates output in a single stream
- Uses **causal masking**: each token can only attend to tokens that came before it (no peeking ahead)
- **Used for**: Nearly everything now. Chat, code generation, reasoning, analysis

```
Encoder-Decoder:
  Input: "Translate to French: Hello, how are you?"
  Encoder: [processes entire input bidirectionally]
  Decoder: "Bonjour" → "," → " comment" → " allez" → "-vous" → "?"

Decoder-Only:
  Input: "Translate to French: Hello, how are you?"
  Output: " Bonjour" → "," → " comment" → " allez" → "-vous" → "?"
  (Input and output are one continuous sequence)
```

**Almost every model you'll use as a developer is decoder-only.** GPT-4o, Claude, Gemini, Llama -- all decoder-only Transformers. Understanding this helps you understand why:

1. The model processes your prompt and its response as one continuous sequence
2. The model can't "go back" and revise earlier tokens (though reasoning models simulate this)
3. System prompts work by being prepended to the sequence

---

## Scale: What Makes LLMs "Large"

The "Large" in LLM refers to the number of **parameters** -- the learned numerical values in the network:

| Model | Parameters | Layers | Attention Heads | Hidden Dimension |
|-------|-----------|--------|----------------|-----------------|
| GPT-2 | 1.5B | 48 | 25 | 1600 |
| Llama 3 8B | 8B | 32 | 32 | 4096 |
| Llama 3 70B | 70B | 80 | 64 | 8192 |
| GPT-4 | Undisclosed | Undisclosed | Undisclosed | Undisclosed |

More parameters means:
- More capacity to store knowledge
- Better ability to handle complex tasks
- Slower inference and higher cost
- More data needed for training

### Mixture of Experts (MoE)

Some models (like Mixtral and reportedly GPT-4) use a **Mixture of Experts** approach. Instead of one massive feed-forward network, they have multiple smaller "expert" networks, and a routing mechanism decides which experts to activate for each token:

```javascript
// Conceptual MoE
function mixtureOfExperts(token, experts, router) {
  // Router decides which 2 of 8 experts to use for this token
  const expertWeights = router(token); // e.g., [0, 0.6, 0, 0, 0, 0.4, 0, 0]

  // Only activate selected experts (sparse computation)
  let output = zeros(token.length);
  for (let i = 0; i < experts.length; i++) {
    if (expertWeights[i] > 0) {
      output = add(output, scale(experts[i](token), expertWeights[i]));
    }
  }

  return output;
}
```

This means a model can have 1.8 trillion total parameters but only activate ~200 billion for any given token, making it faster than a dense model of the same total size.

---

## Training: How LLMs Learn (The 30,000-Foot View)

You don't need to train models, but understanding the training process explains their behavior.

### Phase 1: Pre-training

The model reads the internet (and books, code, etc.) and learns to predict the next token:

```
Training example:
  Input:  "The capital of France is"
  Target: "Paris"

The model adjusts its parameters to make "Paris" more likely given this context.
Repeat this billions of times across trillions of tokens.
```

This is where the model learns language, facts, reasoning patterns, and code. Pre-training costs millions of dollars in compute.

### Phase 2: Fine-tuning / RLHF

Raw pre-trained models are like someone who's read everything but has no social skills. They need to be taught to be helpful, harmless, and honest:

1. **Supervised Fine-Tuning (SFT)**: Human trainers write ideal responses to prompts
2. **Reinforcement Learning from Human Feedback (RLHF)**: Humans rank model outputs from best to worst, and a reward model is trained on these rankings. The LLM is then fine-tuned to maximize the reward model's score

This is why ChatGPT feels different from raw GPT-3 -- it's been trained to be conversational and helpful.

### What This Means for You

- **Knowledge cutoff**: Models only know what was in their training data. If you need current info, you must provide it (RAG -- Module 07)
- **Training biases**: Models reflect patterns in their training data, including biases. Always review outputs for sensitive applications
- **Instruction following**: Models are specifically trained to follow instructions, which is why prompting is so powerful (Module 02)

---

## Practical Implications for Web Developers

Here's what the Transformer architecture means for your day-to-day work:

### 1. Context Window = Working Memory

The attention mechanism has a fixed size. All your input tokens + output tokens must fit within the **context window**:

| Model | Context Window |
|-------|---------------|
| GPT-4o | 128K tokens |
| Claude 4 Sonnet | 200K tokens |
| Gemini 1.5 Pro | 2M tokens |
| Llama 3 70B | 128K tokens |

Larger context windows let you send more information but cost more and may degrade performance on information buried in the middle.

### 2. Attention Is O(n^2)

Self-attention compares every token to every other token, making it quadratic in sequence length. Doubling the context length quadruples the computation. This is why:

- Longer prompts are slower and more expensive
- There's an upper limit on context window size
- Techniques like sparse attention and sliding window attention exist to reduce this cost

### 3. Position Matters

Because of how positional encodings work, models tend to pay more attention to information at the **beginning** and **end** of the context. Important instructions should go at the start (system prompt) or end (just before the question) of your prompt.

### 4. Parallel Processing = Fast Prefill

When the model first processes your prompt, it can do so in parallel (all tokens at once). But generation is sequential (one token at a time). This is why:

- Sending a long prompt adds less latency than you'd expect
- Generating a long response takes proportionally more time
- "Time to first token" is usually fast; total generation time depends on output length

---

## Key Takeaways

1. **Transformers replaced sequential processing with parallel attention**, letting every token "see" every other token simultaneously.

2. **Attention is like a fuzzy dictionary lookup** -- tokens create queries, keys, and values. The model learns which tokens are relevant to each other.

3. **Multi-head attention examines text from multiple perspectives** simultaneously, capturing syntax, semantics, coreference, and more.

4. **Transformer blocks stack attention + feed-forward layers** with residual connections. Modern models have dozens to over a hundred layers.

5. **Almost all models you'll use are decoder-only Transformers** that generate text one token at a time, left to right.

6. **Context windows are finite** and determined by the attention mechanism. Everything (prompt + response) must fit within the window.

7. **Training happens in two phases**: pre-training (next-token prediction on massive data) and fine-tuning (RLHF to make the model helpful and safe).

---

## Try It Yourself

**Exercise: Visualize Attention**

Understanding attention patterns helps you write better prompts. Try this:

1. Visit [BertViz](https://jessevig.com/bertviz.html) or the [Transformer Explainer](https://poloclub.github.io/transformer-explainer/) interactive visualization
2. Enter a sentence like: "The developer who wrote the backend code deployed it to production"
3. Observe which tokens attend to which other tokens in different heads
4. Try sentences with ambiguous pronouns and see how the model resolves them

**Thought Exercise:**

Consider these two prompts:

```
Prompt A: "Summarize this article: [5000 word article]. Keep it under 3 sentences."

Prompt B: "Keep your summary under 3 sentences. Summarize this article: [5000 word article]."
```

Based on what you've learned about positional encoding and attention:
- Which prompt would you expect to produce better results?
- Why might the instruction placement matter?
- Try both formats with a real LLM and compare the outputs.

Write down your observations -- we'll revisit this in Module 02 when we cover prompt engineering techniques.
