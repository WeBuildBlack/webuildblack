---
title: "Few-Shot Prompting: Teaching by Example"
estimatedMinutes: 50
---

# Few-Shot Prompting: Teaching by Example

Here's something every great teacher knows: sometimes showing is better than telling. You could explain how to write a commit message with a page of rules, or you could show three great commit messages and say "like these." LLMs learn the same way -- and that's the core of few-shot prompting.

As builders in our community, we teach each other by example every day. Code reviews, pair programming, mentorship -- it's all pattern demonstration. Few-shot prompting brings that same approach to AI.

---

## Zero-Shot vs Few-Shot vs Many-Shot

Let's start with the vocabulary:

### Zero-Shot Prompting

Give the model a task with no examples. It relies entirely on its training to figure out what you want.

```javascript
// Zero-shot: No examples provided
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'system',
      content: 'Classify the sentiment of the following text as positive, negative, or neutral.',
    },
    {
      role: 'user',
      content: 'The new update completely broke my workflow. Nothing works anymore.',
    },
  ],
});
// Model responds: "negative"
// Works fine for simple tasks, but output format may vary
```

### Few-Shot Prompting

Provide a few examples (typically 2-5) that demonstrate the exact input/output pattern you want. The model generalizes from these examples.

```javascript
// Few-shot: Examples demonstrate the pattern
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'system',
      content: 'Classify the sentiment of the following text as positive, negative, or neutral. Respond with ONLY the classification label.',
    },
    // Example 1
    { role: 'user', content: 'I absolutely love this product! Best purchase ever.' },
    { role: 'assistant', content: 'positive' },
    // Example 2
    { role: 'user', content: 'It arrived on time. Works as described.' },
    { role: 'assistant', content: 'neutral' },
    // Example 3
    { role: 'user', content: 'Terrible quality. Broke after two days.' },
    { role: 'assistant', content: 'negative' },
    // Actual input
    {
      role: 'user',
      content: 'The new update completely broke my workflow. Nothing works anymore.',
    },
  ],
});
// Model responds: "negative"
// But now it consistently uses the exact format from the examples
```

### Many-Shot Prompting

Use many examples (10-100+), leveraging the large context windows of modern models. This can approach fine-tuning quality without actually fine-tuning.

```javascript
// Many-shot: Lots of examples for complex/nuanced tasks
const examples = loadExamplesFromDataset(); // 50+ examples

const messages = [
  {
    role: 'system',
    content: 'Classify support tickets into one of these categories: billing, technical, account, feature-request, other.',
  },
  // Map each example into user/assistant message pairs
  ...examples.flatMap(ex => [
    { role: 'user', content: ex.ticketText },
    { role: 'assistant', content: ex.category },
  ]),
  // Actual input
  { role: 'user', content: newTicket.text },
];
```

---

## When to Use Each Approach

| Approach | Best For | Token Cost | Quality |
|----------|---------|------------|---------|
| Zero-shot | Simple tasks, well-known formats | Lowest | Good for common tasks |
| Few-shot (2-5 examples) | Custom formats, nuanced classification | Medium | Very good |
| Many-shot (10-100) | Complex tasks, edge cases, high accuracy | Higher | Excellent |

**Rule of thumb**: Start with zero-shot. If the output format or quality isn't what you need, add 2-3 examples. If edge cases are causing problems, add more targeted examples.

---

## Crafting Effective Few-Shot Examples

Not all examples are created equal. Here's how to write examples that actually improve model performance:

### Rule 1: Examples Should Be Diverse

Cover the range of inputs the model will see in production:

```javascript
// Bad: All examples are similar
const examples = [
  { input: 'Great product!', output: 'positive' },
  { input: 'Wonderful experience!', output: 'positive' },
  { input: 'Amazing quality!', output: 'positive' },
  // Model learns "everything is positive"
];

// Good: Examples cover different cases
const examples = [
  { input: 'Great product! Exceeded my expectations.', output: 'positive' },
  { input: 'Arrived damaged. Requesting a refund.', output: 'negative' },
  { input: 'It works. Nothing special.', output: 'neutral' },
  { input: 'Love the design but the battery is awful.', output: 'mixed' },
  // Model learns the full spectrum
];
```

### Rule 2: Examples Should Match Your Actual Data

If your users write informal messages with typos, your examples should look like that too:

```javascript
// Bad: Overly clean examples when real data is messy
const examples = [
  {
    input: 'I would like to inquire about the status of my order, number 12345.',
    output: '{ "intent": "order_status", "order_id": "12345" }',
  },
];

// Good: Examples match real user input
const examples = [
  {
    input: 'yo where tf is my order #12345???',
    output: '{ "intent": "order_status", "order_id": "12345" }',
  },
  {
    input: 'hi i ordered something last week order number is 67890 when will it come',
    output: '{ "intent": "order_status", "order_id": "67890" }',
  },
  {
    input: 'I need to return my purchase. Order 11111.',
    output: '{ "intent": "return_request", "order_id": "11111" }',
  },
];
```

### Rule 3: Include Edge Cases

Explicitly show the model how to handle tricky inputs:

```javascript
// Include examples for edge cases
const examples = [
  // Normal case
  {
    input: 'Meeting with Sarah at 3pm tomorrow',
    output: '{ "type": "meeting", "attendees": ["Sarah"], "time": "3:00 PM", "date": "tomorrow" }',
  },
  // Edge case: No time specified
  {
    input: 'Need to schedule something with the design team',
    output: '{ "type": "meeting", "attendees": ["design team"], "time": null, "date": null }',
  },
  // Edge case: Ambiguous input
  {
    input: 'Lunch?',
    output: '{ "type": "meeting", "attendees": [], "time": null, "date": null, "note": "Unclear intent - may be a lunch invitation" }',
  },
  // Edge case: Not a meeting at all
  {
    input: 'Remember to buy groceries',
    output: '{ "type": "task", "attendees": [], "time": null, "date": null }',
  },
];
```

### Rule 4: Be Consistent in Format

Every example should follow the exact same format. Inconsistency in examples creates inconsistency in outputs:

```javascript
// Bad: Inconsistent formats across examples
const examples = [
  { input: 'bug report', output: 'Category: Bug' },
  { input: 'feature idea', output: 'feature-request' },
  { input: 'billing question', output: '{"category": "billing"}' },
  // Three different formats! The model doesn't know which to use
];

// Good: Perfectly consistent format
const examples = [
  { input: 'The login page crashes on Safari', output: 'bug' },
  { input: 'Can you add dark mode?', output: 'feature-request' },
  { input: 'I was charged twice this month', output: 'billing' },
  { input: 'How do I reset my password?', output: 'account' },
];
```

---

## Few-Shot Patterns for Common Tasks

### Pattern 1: Classification

```javascript
async function classifyText(text, categories, examples) {
  const messages = [
    {
      role: 'system',
      content: `Classify the following text into one of these categories: ${categories.join(', ')}.
Respond with ONLY the category name, nothing else.`,
    },
    // Add few-shot examples
    ...examples.flatMap(ex => [
      { role: 'user', content: ex.text },
      { role: 'assistant', content: ex.category },
    ]),
    // Actual input
    { role: 'user', content: text },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',  // Classification is a simple task
    messages,
    temperature: 0,  // Deterministic for classification
    max_tokens: 20,
  });

  return response.choices[0].message.content.trim();
}

// Usage
const category = await classifyText(
  'The checkout button doesn\'t work on mobile',
  ['bug', 'feature-request', 'question', 'documentation'],
  [
    { text: 'App crashes when I upload a photo', category: 'bug' },
    { text: 'Would be nice to have SSO login', category: 'feature-request' },
    { text: 'How do I export my data?', category: 'question' },
    { text: 'The API docs are missing the rate limit section', category: 'documentation' },
  ]
);
console.log(category);  // "bug"
```

### Pattern 2: Data Extraction

```javascript
async function extractData(rawText, schema, examples) {
  const messages = [
    {
      role: 'system',
      content: `Extract structured data from the given text.
Output format: JSON matching this schema:
${JSON.stringify(schema, null, 2)}

If a field cannot be determined, use null.`,
    },
    ...examples.flatMap(ex => [
      { role: 'user', content: ex.input },
      { role: 'assistant', content: JSON.stringify(ex.output) },
    ]),
    { role: 'user', content: rawText },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    temperature: 0,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}

// Usage: Extract event information
const eventData = await extractData(
  'Join us next Friday at 6pm at the Brooklyn Public Library for a panel on AI in Education. RSVP required.',
  {
    event_name: 'string',
    date: 'string',
    time: 'string',
    location: 'string',
    rsvp_required: 'boolean',
  },
  [
    {
      input: 'Workshop on React hooks this Saturday at 2pm, WeWork Dumbo. Free admission.',
      output: {
        event_name: 'Workshop on React hooks',
        date: 'this Saturday',
        time: '2:00 PM',
        location: 'WeWork Dumbo',
        rsvp_required: false,
      },
    },
    {
      input: 'Monthly meetup canceled due to weather.',
      output: {
        event_name: 'Monthly meetup',
        date: null,
        time: null,
        location: null,
        rsvp_required: null,
      },
    },
  ]
);
```

### Pattern 3: Text Transformation

```javascript
async function transformText(text, instructions, examples) {
  const messages = [
    {
      role: 'system',
      content: instructions,
    },
    ...examples.flatMap(ex => [
      { role: 'user', content: ex.input },
      { role: 'assistant', content: ex.output },
    ]),
    { role: 'user', content: text },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    temperature: 0.3,
  });

  return response.choices[0].message.content;
}

// Usage: Convert technical descriptions to marketing copy
const marketingCopy = await transformText(
  'PostgreSQL database with ACID compliance, supports JSON columns, has row-level security, and handles 10K concurrent connections.',
  'Rewrite the technical description as compelling marketing copy for a non-technical audience. Keep it under 2 sentences.',
  [
    {
      input: 'REST API with OAuth 2.0 authentication, rate limiting at 1000 req/min, and 99.9% uptime SLA.',
      output: 'Connect your app seamlessly with our secure, reliable API that handles thousands of requests per minute with enterprise-grade uptime.',
    },
    {
      input: 'Real-time WebSocket connections with auto-reconnect, message queuing, and end-to-end encryption.',
      output: 'Keep your users connected with instant, secure real-time messaging that never drops a beat -- even on unreliable networks.',
    },
  ]
);
```

### Pattern 4: Code Generation

```python
async def generate_code(task_description: str, examples: list) -> str:
    messages = [
        {
            "role": "system",
            "content": """You are an expert JavaScript developer.
Generate clean, well-commented code based on the task description.
Use modern ES6+ syntax. Include error handling.
Respond with ONLY the code, no explanations.""",
        },
    ]

    for ex in examples:
        messages.append({"role": "user", "content": ex["task"]})
        messages.append({"role": "assistant", "content": ex["code"]})

    messages.append({"role": "user", "content": task_description})

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0.2,
    )

    return response.choices[0].message.content
```

### A Note on Token Cost

Keep in mind that few-shot examples add tokens to every single request. Five examples at ~100 tokens each means 500 extra input tokens per API call. At scale, this adds up fast -- if you're making 10,000 requests per day with GPT-4o, those examples alone cost approximately $12.50/day (5M extra input tokens x $2.50/1M). Anthropic's prompt caching is specifically designed for this pattern: cache the system prompt and few-shot examples so you only pay full price for the new user message on each request, reducing the cached portion's cost by 90%.

---

## Dynamic Few-Shot Selection

In production, you often have a large pool of examples but can only include a few in each prompt (due to token limits). The key is selecting the **most relevant** examples for each input.

### Similarity-Based Selection

Choose examples most similar to the current input:

```javascript
import { cosineSimilarity, getEmbedding } from './embedding-utils.js';

class DynamicFewShotSelector {
  constructor(examples) {
    this.examples = examples;
    this.embeddings = null;
  }

  async initialize() {
    // Pre-compute embeddings for all examples
    this.embeddings = await Promise.all(
      this.examples.map(async (ex) => ({
        ...ex,
        embedding: await getEmbedding(ex.input),
      }))
    );
  }

  async selectExamples(input, k = 3) {
    const inputEmbedding = await getEmbedding(input);

    // Rank examples by similarity to the input
    const ranked = this.embeddings
      .map(ex => ({
        ...ex,
        similarity: cosineSimilarity(inputEmbedding, ex.embedding),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    // Return top-k most similar examples
    return ranked.slice(0, k);
  }
}

// Usage
const selector = new DynamicFewShotSelector(allExamples);
await selector.initialize();

// For each user input, select the most relevant examples
const relevantExamples = await selector.selectExamples(userInput, 3);
const response = await classifyText(userInput, categories, relevantExamples);
```

### Category-Based Selection

Ensure examples cover different categories:

```javascript
function selectDiverseExamples(examples, k = 4) {
  // Group examples by category
  const byCategory = {};
  for (const ex of examples) {
    if (!byCategory[ex.category]) {
      byCategory[ex.category] = [];
    }
    byCategory[ex.category].push(ex);
  }

  // Select one from each category, round-robin
  const selected = [];
  const categories = Object.keys(byCategory);
  let categoryIndex = 0;

  while (selected.length < k && selected.length < examples.length) {
    const category = categories[categoryIndex % categories.length];
    const available = byCategory[category];
    if (available.length > 0) {
      // Pick a random example from this category
      const idx = Math.floor(Math.random() * available.length);
      selected.push(available.splice(idx, 1)[0]);
    }
    categoryIndex++;
  }

  return selected;
}
```

---

## Few-Shot Prompting with Anthropic's Claude

Claude handles few-shot prompting similarly but with some nuances:

```python
import anthropic

client = anthropic.Anthropic()

def few_shot_classify(text: str, examples: list) -> str:
    # Build messages from examples
    messages = []
    for ex in examples:
        messages.append({"role": "user", "content": ex["input"]})
        messages.append({"role": "assistant", "content": ex["output"]})

    # Add the actual input
    messages.append({"role": "user", "content": text})

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        system="""Classify the sentiment of the given text.
Respond with ONLY one word: positive, negative, neutral, or mixed.""",
        messages=messages,
        max_tokens=10,
        temperature=0,
    )

    return response.content[0].text.strip()

# Usage
result = few_shot_classify(
    "The concert was okay but the venue was too crowded",
    [
        {"input": "Best day of my life!", "output": "positive"},
        {"input": "Worst service ever. Never going back.", "output": "negative"},
        {"input": "It was fine. Nothing memorable.", "output": "neutral"},
        {"input": "Great food but terrible wait times.", "output": "mixed"},
    ]
)
print(result)  # "mixed"
```

---

## Measuring Few-Shot Effectiveness

How do you know if your examples are actually helping? Test systematically:

```javascript
async function evaluateFewShotImpact(testCases, exampleSets) {
  const results = {};

  for (const [setName, examples] of Object.entries(exampleSets)) {
    let correct = 0;

    for (const testCase of testCases) {
      const prediction = await classifyWithExamples(
        testCase.input,
        examples
      );

      if (prediction.trim().toLowerCase() === testCase.expected.toLowerCase()) {
        correct++;
      }
    }

    results[setName] = {
      accuracy: (correct / testCases.length * 100).toFixed(1) + '%',
      correct,
      total: testCases.length,
    };
  }

  return results;
}

// Compare zero-shot vs 3-shot vs 5-shot
const results = await evaluateFewShotImpact(testCases, {
  'zero-shot': [],
  '3-shot': examples.slice(0, 3),
  '5-shot': examples.slice(0, 5),
  '5-shot-diverse': selectDiverseExamples(examples, 5),
});

console.log(results);
// {
//   'zero-shot':       { accuracy: '72.0%', correct: 36, total: 50 },
//   '3-shot':          { accuracy: '86.0%', correct: 43, total: 50 },
//   '5-shot':          { accuracy: '90.0%', correct: 45, total: 50 },
//   '5-shot-diverse':  { accuracy: '94.0%', correct: 47, total: 50 },
// }
```

---

## Common Pitfalls

### Pitfall 1: Example Order Matters

The order of examples can affect the model's output. Generally:
- Put the most representative examples first
- If there's a class imbalance in your examples, the model may bias toward classes that appear last
- Experiment with different orderings

### Pitfall 2: Too Many Examples Wastes Tokens

More examples isn't always better. After 5-10 good examples, adding more may not improve quality but will increase cost and latency. Always measure.

### Pitfall 3: Examples That Contradict Each Other

If your examples have inconsistencies, the model gets confused:

```javascript
// Bad: Contradictory examples
{ input: 'It was okay', output: 'neutral' },
{ input: 'It was okay I guess', output: 'negative' },  // Wait, is "okay" neutral or negative?
```

### Pitfall 4: Not Matching Production Data Distribution

If 80% of your production data is negative sentiment but all your examples are positive, the model will be biased. Match the distribution of your examples to your actual data.

---

## Key Takeaways

1. **Few-shot prompting teaches models by example.** Show the model what you want instead of (or in addition to) telling it. This is often more effective than elaborate instructions.

2. **Start zero-shot, add examples as needed.** Don't over-engineer. If zero-shot gives you 90% accuracy and that's sufficient, you're done.

3. **Example quality matters more than quantity.** Three diverse, well-crafted examples beat ten sloppy ones. Cover edge cases, match real data, and be format-consistent.

4. **Use dynamic example selection** when you have a large example pool. Select examples most similar to the current input for better results.

5. **Measure the impact.** Always compare zero-shot vs few-shot performance on your actual task. Don't assume examples help -- verify.

6. **Be mindful of token costs.** Each example pair adds tokens to every API call. In high-volume applications, even a few hundred extra tokens per call adds up.

---

## Try It Yourself

**Exercise: Build a Few-Shot Classification Pipeline**

Create a text classifier for a domain you care about. Here's the framework:

1. Choose a classification task (e.g., categorizing community messages, triaging bug reports, routing support tickets)
2. Write 10 diverse examples covering all categories
3. Create a test set of 20 inputs with known correct labels
4. Run the test set with 0, 3, 5, and 10 examples
5. Compare accuracy across each configuration

```javascript
// Starter code
const CATEGORIES = ['question', 'feedback', 'bug-report', 'showcase', 'off-topic'];

const examples = [
  { text: 'How do I connect to the Slack API?', category: 'question' },
  { text: 'The new dashboard design looks amazing!', category: 'feedback' },
  // Add 8 more...
];

const testSet = [
  { text: 'Has anyone used Prisma with PostgreSQL?', expected: 'question' },
  { text: 'Check out my new portfolio site!', expected: 'showcase' },
  // Add 18 more...
];

// Run evaluation
for (const numExamples of [0, 3, 5, 10]) {
  const accuracy = await evaluate(testSet, examples.slice(0, numExamples));
  console.log(`${numExamples} examples: ${accuracy}% accuracy`);
}
```

Record your results. Which number of examples gives you the best accuracy-to-cost ratio?
