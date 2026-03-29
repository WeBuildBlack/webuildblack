---
title: "What Are Large Language Models?"
estimatedMinutes: 45
isFreePreview: true
---

# What Are Large Language Models?

You already know how to build web apps. You can spin up a REST API, wrangle state in React, and deploy to production on a Friday afternoon (though maybe you shouldn't). Now you're here because you want to add something new to your toolkit: **AI that actually understands language**.

Large Language Models (LLMs) are the engines behind tools like ChatGPT, Claude, and GitHub Copilot. They're not magic, and they're not sentient. They're sophisticated pattern-matching machines trained on massive amounts of text data. Understanding what they are, and what they aren't, is the first step to building real AI features into your applications.

As builders in our community, understanding this technology isn't optional anymore. It's the next layer of the stack, and it's reshaping every industry. Let's break it down.

---

## What Exactly Is an LLM?

A **Large Language Model** is a neural network trained to predict the next token (roughly, the next word or piece of a word) in a sequence. That's it at the core. But from that simple objective emerges something remarkable: a system that can write code, summarize documents, translate languages, answer questions, and hold conversations.

Think of it like autocomplete on your phone, but scaled up by several orders of magnitude:

| Feature | Phone Autocomplete | Large Language Model |
|---------|-------------------|---------------------|
| Training data | Your texts | Billions of web pages, books, code |
| Parameters | Thousands | Billions to trillions |
| Context | A few words | Thousands to millions of words |
| Output | Next word suggestion | Multi-paragraph, structured responses |

An LLM doesn't "know" things the way you do. It has learned statistical patterns about how language works. When you ask it a question, it's generating the most probable sequence of tokens that would follow your input, based on everything it learned during training.

### The Key Insight for Developers

Here's what matters for you as a web developer: **LLMs are API-callable text-in, text-out functions**. You send text (a "prompt"), you get text back (a "completion" or "response"). That's the interface. Everything else like the neural networks, the training, and the GPU clusters is abstracted away behind an API endpoint.

```javascript
// At its simplest, using an LLM looks like this:
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [
      { role: 'user', content: 'Explain REST APIs in one sentence.' }
    ],
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);
// "REST APIs are a way for software systems to communicate over HTTP
//  using standard methods like GET, POST, PUT, and DELETE to manage resources."
```

```python
# Same thing in Python
import openai

client = openai.OpenAI()  # Uses OPENAI_API_KEY env var

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "Explain REST APIs in one sentence."}
    ]
)

print(response.choices[0].message.content)
```

You already know how to call APIs. You already know how to handle async responses. The hardest part of AI engineering isn't the API calls -- it's understanding what's happening behind them so you can use them effectively.

---

## A Brief History: How We Got Here

Understanding where LLMs came from helps you understand their capabilities and limitations. Here's the timeline that matters:

### The Pre-Transformer Era (Before 2017)

Before LLMs, natural language processing (NLP) was painful. Systems relied on hand-coded rules, statistical methods, or smaller neural networks (RNNs, LSTMs) that struggled with long text. If you've ever used a chatbot from 2015, you know how bad it was.

### The Transformer Revolution (2017)

Everything changed with a paper titled **"Attention Is All You Need"** by researchers at Google. They introduced the **Transformer architecture** -- a new way to process sequences of text that could:

- Handle long-range dependencies (understanding that a pronoun refers to something mentioned paragraphs ago)
- Process text in parallel rather than word-by-word (making training much faster)
- Scale efficiently with more data and compute

We'll dive deep into Transformers in the next lesson. For now, just know: Transformers are the architecture that makes modern LLMs possible.

### GPT and the Scaling Era (2018-2022)

OpenAI took the Transformer architecture and ran with it:

| Model | Year | Parameters | Key Milestone |
|-------|------|-----------|---------------|
| GPT-1 | 2018 | 117M | Proved pre-training + fine-tuning works |
| GPT-2 | 2019 | 1.5B | Generated surprisingly coherent text |
| GPT-3 | 2020 | 175B | Showed "few-shot" learning from examples in prompts |
| ChatGPT | 2022 | ~175B (fine-tuned) | Made LLMs accessible to everyone |
| GPT-4 | 2023 | Undisclosed (MoE architecture) | Multimodal, dramatically more capable |
| GPT-4o | 2024 | Undisclosed | Faster, cheaper, multimodal native |

The key discovery was a **scaling law**: make the model bigger, train it on more data, and it gets predictably better. This kicked off an arms race.

### The Current Landscape (2023-Present)

Now multiple organizations are building frontier models:

- **OpenAI**: GPT-4o, o1, o3 -- the pioneer, strong general-purpose models
- **Anthropic**: Claude 4 Sonnet, Claude Opus 4 -- emphasis on safety, strong at coding and analysis
- **Google DeepMind**: Gemini 1.5, Gemini 2.0 -- deep Google integration, massive context windows
- **Meta**: Llama 3, Llama 4 -- open-weight models you can run yourself
- **Mistral**: Mistral Large, Mixtral -- strong European open-source contender

As a developer, this competition is great for you. It means more options, lower prices, and rapid improvement.

---

## How LLMs Generate Text

Let's demystify the generation process. When you send a prompt to an LLM, here's what happens:

### Step 1: Tokenization

Your text gets broken into **tokens** -- pieces of words, whole words, or punctuation. We'll cover this in depth in Lesson 3, but here's a quick look:

```
Input:  "Hello, how are you doing today?"
Tokens: ["Hello", ",", " how", " are", " you", " doing", " today", "?"]
```

### Step 2: Processing

The tokens pass through the neural network (the Transformer). Each token gets converted to a numerical representation (an "embedding"), processed through many layers of attention and computation, and the model produces a probability distribution over all possible next tokens.

### Step 3: Token Selection

The model doesn't just pick the single most likely next token. It samples from the probability distribution, controlled by a parameter called **temperature**:

- **Temperature = 0**: Always pick the most probable token (deterministic, good for factual tasks)
- **Temperature = 0.7**: Some randomness (good for creative tasks)
- **Temperature = 1.0**: Default sampling
- **Temperature = 1.5+**: High randomness (can get incoherent)

```javascript
// You control this in your API calls
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Write a tagline for a coding bootcamp' }],
  temperature: 0.8,  // Creative task, so we want some variety
});
```

### Step 4: Repeat

The generated token gets appended to the input, and the whole thing runs again to produce the next token. This repeats until the model generates a stop token or hits the maximum length.

```
Prompt:     "The capital of France is"
Step 1:     "The capital of France is" → " Paris"
Step 2:     "The capital of France is Paris" → "."
Step 3:     "The capital of France is Paris." → [STOP]
```

This is called **autoregressive generation** -- each new token depends on all the tokens that came before it.

### Why This Matters for You

Understanding autoregressive generation explains several things you'll encounter:

1. **Streaming responses**: Models generate one token at a time, so you can stream them to the user as they're produced (like ChatGPT's typing effect)
2. **Latency**: Longer outputs take longer because each token requires a full pass through the network
3. **Cost**: You're charged per token, so verbosity costs money
4. **Hallucinations**: The model is predicting "probable" text, not looking up facts. It can generate plausible-sounding nonsense

```javascript
// Streaming responses in JavaScript
const stream = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Explain promises in JavaScript' }],
  stream: true,  // Enable streaming
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || '';
  process.stdout.write(content);  // Print each token as it arrives
}
```

```python
# Streaming in Python
stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Explain promises in JavaScript"}],
    stream=True,
)

for chunk in stream:
    content = chunk.choices[0].delta.content or ""
    print(content, end="", flush=True)
```

---

## What LLMs Can and Cannot Do

Before you start building, set your expectations correctly.

### What LLMs Are Good At

- **Text generation**: Writing, summarizing, paraphrasing, translating
- **Code generation**: Writing, explaining, debugging, and refactoring code
- **Classification**: Categorizing text (sentiment, topic, intent)
- **Extraction**: Pulling structured data from unstructured text
- **Conversation**: Multi-turn dialogue with context retention
- **Reasoning**: Step-by-step problem solving (with proper prompting)
- **Multimodal understanding**: Modern LLMs (GPT-4o, Claude) can also process images alongside text, enabling tasks like image description, visual Q&A, and document analysis from screenshots

### What LLMs Are NOT Good At

- **Math**: They're language models, not calculators. They can reason about math but make arithmetic errors
- **Real-time data**: They don't have access to current information unless you provide it (this is where RAG comes in -- Module 07)
- **Determinism**: Same input can produce different output. If you need exact reproducibility, you need additional strategies
- **Long-term memory**: They don't remember previous conversations unless you provide the history
- **Truth**: They generate plausible text, not verified facts. Always validate critical outputs
- **Private data**: They only know what was in their training data or what you provide in the prompt
- **Bias and harmful content**: Models can sometimes produce biased, stereotyped, or harmful outputs reflecting patterns in their training data. Responsible AI engineering includes adding safeguards, content filtering, and human review -- we'll cover this in detail in Module 10

### The "Stochastic Parrot" vs "Reasoning Engine" Debate

There's an ongoing debate about whether LLMs truly "understand" language or are just very sophisticated pattern matchers. For you as a developer, this debate is less important than the practical question: **can they solve your users' problems?**

The answer, increasingly, is yes -- but only if you understand their limitations and design your systems accordingly.

---

## LLMs in Web Applications: Real Use Cases

Let's ground this in reality. Here are patterns you'll implement throughout this course:

### 1. Smart Search

Instead of keyword matching, let users search in natural language:

```javascript
// Traditional search
const results = products.filter(p =>
  p.name.toLowerCase().includes(query.toLowerCase())
);

// AI-powered search (conceptual -- we'll build this for real later)
const results = await semanticSearch(query, productEmbeddings);
// "comfortable shoes for standing all day" → finds ergonomic sneakers,
// cushioned insoles, etc., even if those exact words aren't in the listing
```

### 2. Content Generation

Help users create content:

```javascript
// Generate a product description from bullet points
const description = await generateText({
  prompt: `Write a product description for an e-commerce site.
Product: ${product.name}
Features: ${product.features.join(', ')}
Tone: Professional but approachable`,
});
```

### 3. Data Extraction

Parse unstructured data into your database schema:

```javascript
// Extract structured data from a support email
const extracted = await extractJSON({
  text: customerEmail,
  schema: {
    sentiment: 'positive | negative | neutral',
    category: 'billing | technical | general',
    urgency: 'low | medium | high',
    summary: 'string',
  },
});
// Now you can route, prioritize, and respond automatically
```

### 4. Conversational Interfaces

Build chatbots that actually work:

```javascript
// A support chatbot with access to your documentation
const response = await chat({
  messages: conversationHistory,
  systemPrompt: `You are a helpful support agent for our platform.
Answer questions based on the following documentation:
${relevantDocs}`,
});
```

---

## The Developer's Mental Model

Here's the mental model that will serve you throughout this course:

**An LLM is a function that takes text and returns text.** Everything else is engineering:

- **Prompt engineering** (Module 02): Crafting inputs that get the outputs you want
- **API integration** (Modules 03-04): Calling the function efficiently and handling responses
- **Feature design** (Module 05): Building user-facing features around the function
- **RAG** (Modules 06-07): Giving the function access to your data
- **Agents** (Module 08): Letting the function call other functions
- **Production** (Module 10): Making it all reliable, fast, and cost-effective

You don't need a PhD in machine learning. You need to understand the interface, the capabilities, and the constraints. That's what this course is about.

---

## Key Takeaways

1. **LLMs are neural networks trained to predict the next token in a sequence.** From this simple objective, complex capabilities emerge.

2. **The Transformer architecture (2017) made modern LLMs possible.** It enabled parallel processing and better handling of long-range text dependencies.

3. **Text in, text out.** At the API level, LLMs are functions that accept text prompts and return text completions. You already know how to work with APIs.

4. **Generation is autoregressive.** Models produce one token at a time, which is why streaming works and why longer outputs cost more.

5. **Temperature controls randomness.** Low temperature for factual tasks, higher temperature for creative tasks.

6. **LLMs are powerful but not infallible.** They can hallucinate, can't do reliable math, and don't have access to real-time information without help.

7. **Multiple frontier models exist** (GPT-4o, Claude, Gemini, Llama, Mistral), each with different strengths, pricing, and trade-offs.

---

## Try It Yourself

**Exercise: Your First LLM API Call**

If you have an OpenAI or Anthropic API key, try this:

1. Set up a new Node.js project: `npm init -y && npm install openai`
2. Create a file called `first-call.js`:

```javascript
import OpenAI from 'openai';

const openai = new OpenAI(); // Uses OPENAI_API_KEY env var

async function main() {
  // Try different prompts and temperatures
  const prompts = [
    'What is a REST API? Explain in 2 sentences.',
    'Write a JavaScript function that reverses a string.',
    'What are three creative names for a coding bootcamp?',
  ];

  for (const prompt of prompts) {
    console.log(`\n--- Prompt: "${prompt}" ---`);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',  // Cheaper model for experimentation
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    console.log(response.choices[0].message.content);
    console.log(`Tokens used: ${response.usage.total_tokens}`);
  }
}

main();
```

3. Run it: `OPENAI_API_KEY=your-key-here node first-call.js`
4. Experiment:
   - Change the temperature to 0 and then to 1.5. How do the outputs differ?
   - Try the same prompt 3 times with temperature=0. Are the outputs identical?
   - Try the same prompt 3 times with temperature=1.0. How much do they vary?

Don't have an API key yet? No worries -- we'll set everything up properly in Module 03. For now, understanding the concepts is what matters.
