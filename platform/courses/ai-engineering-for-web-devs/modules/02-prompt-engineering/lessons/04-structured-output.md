---
title: "Structured Output: Getting JSON from LLMs"
estimatedMinutes: 75
---

# Structured Output: Getting JSON from LLMs

LLMs generate text. Your application consumes data structures. Bridging that gap is one of the most critical skills in AI engineering. If you can't reliably get structured, parseable output from an LLM, you can't build production features.

This lesson covers how to get consistent JSON output, enforce schemas, parse responses safely, and handle the inevitable edge cases. By the end, you'll have patterns you can drop into any project.

As builders in our community, we know that reliable systems are built on reliable interfaces. An API that returns well-formed JSON sometimes and prose other times isn't an API -- it's a headache. Let's fix that.

---

## The Problem: LLMs Love to Chat

By default, LLMs produce natural language responses. Ask for structured data and you might get:

```
User: Extract the name and email from "Contact Jordan at jordan@example.com"

LLM: Sure! The name mentioned in the text is **Jordan** and the email
address is **jordan@example.com**. Let me know if you need anything else!
```

That's a great response for a human reader. It's terrible for your code. You need:

```json
{ "name": "Jordan", "email": "jordan@example.com" }
```

Getting LLMs to consistently produce clean, parseable JSON requires specific techniques. Let's go through them from simplest to most robust.

---

## Technique 1: Prompt-Based JSON Requests

The simplest approach: tell the model to respond in JSON.

```javascript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'system',
      content: `Extract contact information from the user's text.
Respond with ONLY valid JSON, no markdown, no explanation.
Use this exact format:
{
  "name": "string or null",
  "email": "string or null",
  "phone": "string or null"
}`,
    },
    {
      role: 'user',
      content: 'Contact Jordan at jordan@example.com or call 555-0123',
    },
  ],
});

const result = JSON.parse(response.choices[0].message.content);
// { name: "Jordan", email: "jordan@example.com", phone: "555-0123" }
```

**Pros**: Simple, works across all providers.
**Cons**: The model might still wrap JSON in markdown code fences, add explanatory text, or produce invalid JSON. You need defensive parsing.

### Defensive JSON Parsing

Always wrap your parsing in safety logic:

```javascript
function extractJSON(text) {
  // Try direct parsing first
  try {
    return JSON.parse(text);
  } catch (e) {
    // Try extracting from markdown code fences
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch (e2) {
        // Continue to next strategy
      }
    }

    // Try finding JSON-like content between curly braces
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e3) {
        // Continue to next strategy
      }
    }

    // Try finding JSON array
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (e4) {
        // All strategies failed
      }
    }

    throw new Error(`Failed to extract JSON from response: ${text.slice(0, 200)}`);
  }
}
```

```python
import json
import re

def extract_json(text: str):
    """Extract JSON from LLM response with fallback strategies."""
    # Strategy 1: Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strategy 2: Extract from markdown code block
    code_block = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if code_block:
        try:
            return json.loads(code_block.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Strategy 3: Find JSON object
    json_match = re.search(r"\{[\s\S]*\}", text)
    if json_match:
        try:
            return json.loads(json_match.group(0))
        except json.JSONDecodeError:
            pass

    # Strategy 4: Find JSON array
    array_match = re.search(r"\[[\s\S]*\]", text)
    if array_match:
        try:
            return json.loads(array_match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Failed to extract JSON from: {text[:200]}")
```

---

## Technique 2: OpenAI's JSON Mode

OpenAI provides a built-in `response_format` parameter that forces the model to output valid JSON:

```javascript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'system',
      content: `Extract contact information from the user's text.
Return a JSON object with keys: name, email, phone.
Use null for any fields not found in the text.`,
    },
    {
      role: 'user',
      content: 'Reach out to Maya at maya.chen@techcorp.io',
    },
  ],
  response_format: { type: 'json_object' },  // Forces valid JSON output
});

// Guaranteed to be valid JSON (no need for defensive parsing)
const result = JSON.parse(response.choices[0].message.content);
// { "name": "Maya", "email": "maya.chen@techcorp.io", "phone": null }
```

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "system",
            "content": "Extract contact info. Return JSON with keys: name, email, phone. Use null if not found.",
        },
        {
            "role": "user",
            "content": "Reach out to Maya at maya.chen@techcorp.io",
        },
    ],
    response_format={"type": "json_object"},
)

result = json.loads(response.choices[0].message.content)
```

**Important**: You MUST mention "JSON" somewhere in your prompt when using `response_format: { type: 'json_object' }`. The API will return an error if you don't.

**Pros**: Guaranteed valid JSON. No defensive parsing needed.
**Cons**: Only controls format (valid JSON), not schema (which keys, types, etc.). OpenAI-specific.

---

## Technique 3: OpenAI Structured Outputs (Schema Enforcement)

This is the most robust approach for OpenAI. You define a JSON Schema, and the model is **guaranteed** to produce output matching that schema:

```javascript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'system',
      content: 'Extract contact information from the provided text.',
    },
    {
      role: 'user',
      content: 'Hi, this is Jordan Lee from Acme Corp. Email me at jordan.lee@acme.com or call 555-867-5309.',
    },
  ],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'contact_info',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          name: {
            type: ['string', 'null'],
            description: 'Full name of the contact',
          },
          email: {
            type: ['string', 'null'],
            description: 'Email address',
          },
          phone: {
            type: ['string', 'null'],
            description: 'Phone number',
          },
          company: {
            type: ['string', 'null'],
            description: 'Company or organization name',
          },
        },
        required: ['name', 'email', 'phone', 'company'],
        additionalProperties: false,
      },
    },
  },
});

const contact = JSON.parse(response.choices[0].message.content);
// Guaranteed to match the schema:
// {
//   "name": "Jordan Lee",
//   "email": "jordan.lee@acme.com",
//   "phone": "555-867-5309",
//   "company": "Acme Corp"
// }
```

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "Extract contact information from the provided text."},
        {"role": "user", "content": "Hi, this is Jordan Lee from Acme Corp. Email me at jordan.lee@acme.com."},
    ],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "contact_info",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "name": {"type": ["string", "null"]},
                    "email": {"type": ["string", "null"]},
                    "phone": {"type": ["string", "null"]},
                    "company": {"type": ["string", "null"]},
                },
                "required": ["name", "email", "phone", "company"],
                "additionalProperties": False,
            },
        },
    },
)

contact = json.loads(response.choices[0].message.content)
```

**Pros**: Schema-level guarantees. The output WILL match your schema. TypeScript-level confidence.
**Cons**: OpenAI-specific. Some schema limitations (no `patternProperties`, limited `$ref` support). Slightly higher latency.

### Using with the OpenAI SDK's Helper

The OpenAI SDK provides a helper for Structured Outputs with Zod (in JavaScript) or Pydantic (in Python):

```javascript
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const ContactInfo = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  company: z.string().nullable(),
});

const response = await openai.beta.chat.completions.parse({
  model: 'gpt-4o',
  messages: [
    { role: 'system', content: 'Extract contact information from the text.' },
    { role: 'user', content: 'Jordan Lee, jordan@acme.com, Acme Corp' },
  ],
  response_format: zodResponseFormat(ContactInfo, 'contact_info'),
});

// Already parsed -- no JSON.parse needed!
const contact = response.choices[0].message.parsed;
// TypeScript knows this is { name: string | null, email: string | null, ... }
```

```python
from pydantic import BaseModel
from openai import OpenAI

class ContactInfo(BaseModel):
    name: str | None
    email: str | None
    phone: str | None
    company: str | None

client = OpenAI()

response = client.beta.chat.completions.parse(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "Extract contact information from the text."},
        {"role": "user", "content": "Jordan Lee, jordan@acme.com, Acme Corp"},
    ],
    response_format=ContactInfo,
)

contact = response.choices[0].message.parsed
# contact is a ContactInfo object with type safety
print(contact.name)   # "Jordan Lee"
print(contact.email)  # "jordan@acme.com"
```

---

## Technique 4: Claude's Approach to Structured Output

As of this writing, Claude primarily uses tool use or assistant prefilling for structured output, though Anthropic has been progressively adding structured output features. Here's how to get reliable JSON from Claude today:

```python
import anthropic
import json

client = anthropic.Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-20250514",
    system="""Extract contact information from the user's text.
You MUST respond with ONLY a valid JSON object, no other text.
Schema:
{
  "name": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "company": "string or null"
}""",
    messages=[
        {
            "role": "user",
            "content": "Jordan Lee from Acme Corp -- jordan.lee@acme.com, 555-0123",
        },
        {
            "role": "assistant",
            "content": "{",  # Prefill forces Claude to continue writing JSON
        },
    ],
    max_tokens=500,
)

# Claude continues from "{" so we need to prepend it
raw = "{" + response.content[0].text
result = json.loads(raw)
```

```javascript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  system: `Extract contact information from the user's text.
Respond with ONLY a valid JSON object.
Schema: { "name": "string|null", "email": "string|null", "phone": "string|null" }`,
  messages: [
    {
      role: 'user',
      content: 'Jordan Lee, jordan@acme.com, 555-0123',
    },
    {
      role: 'assistant',
      content: '{',
    },
  ],
  max_tokens: 500,
});

const raw = '{' + response.content[0].text;
const result = JSON.parse(raw);
```

### Claude's Tool Use for Structured Output

A more robust approach with Claude is to use **tool use** (function calling) to enforce structure:

```python
response = client.messages.create(
    model="claude-sonnet-4-20250514",
    system="Extract contact information from the user's text.",
    messages=[
        {"role": "user", "content": "Jordan Lee, jordan@acme.com, Acme Corp"},
    ],
    tools=[
        {
            "name": "extract_contact",
            "description": "Extract structured contact information",
            "input_schema": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Full name"},
                    "email": {"type": "string", "description": "Email address"},
                    "phone": {
                        "type": ["string", "null"],
                        "description": "Phone number if available",
                    },
                    "company": {
                        "type": ["string", "null"],
                        "description": "Company name if available",
                    },
                },
                "required": ["name", "email"],
            },
        }
    ],
    tool_choice={"type": "tool", "name": "extract_contact"},
    max_tokens=500,
)

# The response will contain a tool_use block with structured input
tool_use = next(block for block in response.content if block.type == "tool_use")
contact = tool_use.input
# {"name": "Jordan Lee", "email": "jordan@acme.com", "phone": null, "company": "Acme Corp"}
```

---

## Technique 5: OpenAI Function Calling

Function calling (tool use) is another way to get structured output from OpenAI. You define a "function" the model can "call," and it produces structured arguments:

```javascript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'user',
      content: 'Jordan Lee from Acme Corp, jordan@acme.com, 555-0123',
    },
  ],
  tools: [
    {
      type: 'function',
      function: {
        name: 'save_contact',
        description: 'Save extracted contact information',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Full name' },
            email: { type: 'string', description: 'Email address' },
            phone: { type: 'string', description: 'Phone number' },
            company: { type: 'string', description: 'Company name' },
          },
          required: ['name', 'email'],
        },
      },
    },
  ],
  tool_choice: { type: 'function', function: { name: 'save_contact' } },
});

// Extract the function call arguments
const toolCall = response.choices[0].message.tool_calls[0];
const contact = JSON.parse(toolCall.function.arguments);
// { "name": "Jordan Lee", "email": "jordan@acme.com", "phone": "555-0123", "company": "Acme Corp" }
```

**When to use function calling vs response_format:**
- Use `response_format` (Structured Outputs) when you want the model's entire response to be structured JSON
- Use function calling when you want the model to decide whether to call a function and what arguments to use
- For pure extraction tasks, either works; `response_format` is slightly simpler

---

## Building a Provider-Agnostic Structured Output Layer

In production, you'll want an abstraction that works across providers:

```javascript
class StructuredLLM {
  constructor(provider, model) {
    this.provider = provider;
    this.model = model;
  }

  async extract(prompt, schema, options = {}) {
    switch (this.provider) {
      case 'openai':
        return this.openaiExtract(prompt, schema, options);
      case 'anthropic':
        return this.anthropicExtract(prompt, schema, options);
      default:
        return this.genericExtract(prompt, schema, options);
    }
  }

  async openaiExtract(prompt, schema, options) {
    const response = await openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: options.systemPrompt || 'Extract data from the text.' },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: schema.name || 'extraction',
          strict: true,
          schema: schema.jsonSchema,
        },
      },
    });

    return JSON.parse(response.choices[0].message.content);
  }

  async anthropicExtract(prompt, schema, options) {
    const response = await anthropic.messages.create({
      model: this.model,
      system: options.systemPrompt || 'Extract data from the text.',
      messages: [
        { role: 'user', content: prompt },
      ],
      tools: [{
        name: schema.name || 'extract_data',
        description: 'Extract structured data',
        input_schema: schema.jsonSchema,
      }],
      tool_choice: { type: 'tool', name: schema.name || 'extract_data' },
      max_tokens: options.maxTokens || 1024,
    });

    const toolUse = response.content.find(block => block.type === 'tool_use');
    return toolUse.input;
  }

  async genericExtract(prompt, schema, options) {
    // Fallback: use prompt engineering + defensive parsing
    const schemaStr = JSON.stringify(schema.jsonSchema, null, 2);
    const response = await this.rawComplete(
      `${options.systemPrompt || 'Extract data from the text.'}\n\nRespond with ONLY valid JSON matching this schema:\n${schemaStr}`,
      prompt
    );
    return extractJSON(response);
  }
}

// Usage -- same interface regardless of provider
const llm = new StructuredLLM('openai', 'gpt-4o');

const contact = await llm.extract(
  'Jordan Lee, jordan@acme.com, Acme Corp',
  {
    name: 'contact_info',
    jsonSchema: {
      type: 'object',
      properties: {
        name: { type: ['string', 'null'] },
        email: { type: ['string', 'null'] },
        phone: { type: ['string', 'null'] },
        company: { type: ['string', 'null'] },
      },
      required: ['name', 'email', 'phone', 'company'],
      additionalProperties: false,
    },
  }
);
```

---

## Real-World Patterns

### Pattern 1: Form Data Extraction

Turn unstructured text into form-ready data:

```javascript
const eventSchema = {
  type: 'object',
  properties: {
    event_name: { type: 'string' },
    date: { type: ['string', 'null'], description: 'ISO 8601 date string' },
    time: { type: ['string', 'null'], description: 'HH:MM format, 24-hour' },
    location: { type: ['string', 'null'] },
    description: { type: ['string', 'null'] },
    is_virtual: { type: 'boolean' },
    rsvp_required: { type: 'boolean' },
    max_attendees: { type: ['integer', 'null'] },
  },
  required: ['event_name', 'date', 'time', 'location', 'description', 'is_virtual', 'rsvp_required', 'max_attendees'],
  additionalProperties: false,
};

const event = await llm.extract(
  `Join us for the WBB Monthly Meetup next Saturday at 6pm!
  We'll be at Brooklyn Public Library, Main Hall.
  Topic: Building with AI APIs. Space is limited to 50 people.
  RSVP on our Slack channel.`,
  { name: 'event_info', jsonSchema: eventSchema },
  { systemPrompt: 'Extract event details from the text. Use ISO 8601 for dates.' }
);
```

### Pattern 2: Multi-Item Extraction

Extract a list of items from text:

```javascript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    {
      role: 'system',
      content: 'Extract all action items from the meeting notes.',
    },
    {
      role: 'user',
      content: `Meeting notes from 2026-03-01:
- Discussed the new homepage redesign. Jordan will create mockups by Friday.
- API rate limiting needs to be implemented. Maya is taking the lead, needs to be done before the March release.
- We need to update the documentation for the new SDK. Alex volunteered but needs access to the staging environment first.
- Budget for Q2 marketing campaign approved. Devin will coordinate with the agency.`,
    },
  ],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'action_items',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                task: { type: 'string' },
                assignee: { type: 'string' },
                deadline: { type: ['string', 'null'] },
                priority: {
                  type: 'string',
                  enum: ['high', 'medium', 'low'],
                },
                dependencies: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['task', 'assignee', 'deadline', 'priority', 'dependencies'],
              additionalProperties: false,
            },
          },
        },
        required: ['items'],
        additionalProperties: false,
      },
    },
  },
});
```

### Pattern 3: Classification with Metadata

Go beyond simple labels -- return structured classifications:

```javascript
const classificationSchema = {
  type: 'object',
  properties: {
    category: {
      type: 'string',
      enum: ['bug', 'feature-request', 'question', 'documentation', 'other'],
    },
    severity: {
      type: 'string',
      enum: ['critical', 'high', 'medium', 'low'],
    },
    summary: { type: 'string' },
    affected_component: { type: ['string', 'null'] },
    reproducible: { type: ['boolean', 'null'] },
    suggested_label: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['category', 'severity', 'summary', 'affected_component', 'reproducible', 'suggested_label'],
  additionalProperties: false,
};

// Classify incoming GitHub issues automatically
async function triageIssue(issueTitle, issueBody) {
  return await llm.extract(
    `Issue Title: ${issueTitle}\n\nIssue Body: ${issueBody}`,
    { name: 'issue_triage', jsonSchema: classificationSchema },
    { systemPrompt: 'Triage this GitHub issue. Classify, assess severity, and suggest labels.' }
  );
}
```

### Pattern 4: Content Generation with Structure

Generate creative content within a strict structure:

```javascript
const blogPostSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    meta_description: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          heading: { type: 'string' },
          content: { type: 'string' },
          has_code_example: { type: 'boolean' },
        },
        required: ['heading', 'content', 'has_code_example'],
        additionalProperties: false,
      },
    },
    tags: {
      type: 'array',
      items: { type: 'string' },
    },
    estimated_reading_minutes: { type: 'integer' },
  },
  required: ['title', 'meta_description', 'sections', 'tags', 'estimated_reading_minutes'],
  additionalProperties: false,
};

const post = await llm.extract(
  'Write a blog post about using Redis for caching in Node.js applications',
  { name: 'blog_post', jsonSchema: blogPostSchema },
  {
    systemPrompt: `Generate a technical blog post. Write detailed content for each section.
Use a practical, tutorial-style voice. Include code examples where relevant.`,
    maxTokens: 4096,
  }
);

// Now you have structured content you can render into any template
```

---

## Validation and Error Handling

Even with Structured Outputs, you should validate the content (not just the format):

```javascript
import Ajv from 'ajv';

const ajv = new Ajv();

function validateAndProcess(data, schema, validators = {}) {
  // Step 1: Validate JSON schema (format)
  const validate = ajv.compile(schema);
  if (!validate(data)) {
    throw new Error(`Schema validation failed: ${JSON.stringify(validate.errors)}`);
  }

  // Step 2: Validate business rules (content)
  const errors = [];

  for (const [field, validatorFn] of Object.entries(validators)) {
    if (data[field] !== null && data[field] !== undefined) {
      const error = validatorFn(data[field]);
      if (error) errors.push(`${field}: ${error}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Content validation failed: ${errors.join('; ')}`);
  }

  return data;
}

// Usage
const contact = await llm.extract(text, contactSchema);

validateAndProcess(contact, contactSchema.jsonSchema, {
  email: (val) => {
    if (!val.includes('@')) return 'Invalid email format';
    return null;
  },
  phone: (val) => {
    if (val && !/^[\d\-\+\(\)\s]+$/.test(val)) return 'Invalid phone format';
    return null;
  },
});
```

### Retry on Failure

When extraction fails, retry with feedback:

```javascript
async function extractWithRetry(prompt, schema, maxRetries = 2) {
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'Extract structured data from the text.',
        },
        { role: 'user', content: prompt },
      ];

      // On retry, include the error feedback
      if (lastError && attempt > 0) {
        messages.push({
          role: 'user',
          content: `Your previous response had an error: ${lastError}. Please try again, ensuring valid JSON matching the schema.`,
        });
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'extraction', strict: true, schema },
        },
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result;
    } catch (error) {
      lastError = error.message;
      console.warn(`Attempt ${attempt + 1} failed: ${error.message}`);
    }
  }

  throw new Error(`Extraction failed after ${maxRetries + 1} attempts: ${lastError}`);
}
```

---

## Structured Output with Streaming

You can combine structured output with streaming for better UX. The JSON arrives token by token, and you can parse it incrementally:

```javascript
import { createParser } from 'eventsource-parser';

async function streamStructuredOutput(prompt, schema) {
  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'Generate data matching the schema.' },
      { role: 'user', content: prompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'output', strict: true, schema },
    },
    stream: true,
  });

  let jsonString = '';

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    jsonString += delta;

    // Optionally, try to parse partial JSON for progressive UI updates
    // (e.g., show fields as they become available)
    process.stdout.write(delta);
  }

  console.log('\n');
  return JSON.parse(jsonString);
}
```

For progressive UI updates with partial JSON, libraries like `partial-json-parser` can help:

```javascript
import { parse as parsePartialJSON } from 'partial-json-parser';

// As JSON streams in, you can parse what's available so far
let buffer = '';
for await (const chunk of stream) {
  buffer += chunk.choices[0]?.delta?.content || '';
  try {
    const partial = parsePartialJSON(buffer);
    // Update UI with whatever fields are available
    updateUI(partial);
  } catch {
    // Not enough JSON yet, keep buffering
  }
}
```

---

## Performance and Cost Considerations

Structured output has trade-offs:

| Approach | Reliability | Latency | Cost | Provider Lock-in |
|----------|------------|---------|------|-----------------|
| Prompt-based | Medium | Low | Low | None |
| JSON Mode | High | Low | Low | OpenAI |
| Structured Outputs | Very High | Medium | Medium | OpenAI |
| Function Calling | High | Medium | Medium | Provider-specific |
| Claude Prefilling | Medium-High | Low | Low | Anthropic |
| Claude Tool Use | High | Medium | Medium | Anthropic |

**Tips for optimization:**
- Use JSON Mode or prompt-based for simple schemas where occasional failures are acceptable
- Use Structured Outputs for critical extraction where every response must be valid
- Use the cheapest model that produces reliable output for your schema complexity
- Cache results for repeated extractions of the same input

---

## Key Takeaways

1. **LLMs output text; your code needs data structures.** Structured output techniques bridge this gap, from simple prompt instructions to schema-enforced guarantees.

2. **OpenAI's Structured Outputs (`response_format: json_schema`) is the most reliable** approach for getting schema-validated JSON. Use it when correctness is critical.

3. **Claude uses tool use or assistant prefilling** for structured output. Tool use is more reliable; prefilling is simpler for basic cases.

4. **Always implement defensive JSON parsing** as a fallback. Even with guarantees, network issues, truncated responses, or provider changes can cause surprises.

5. **Validate content, not just format.** A properly structured JSON object can still contain wrong data. Add business-rule validation on top of schema validation.

6. **Build provider-agnostic abstractions.** Wrap structured output behind an interface so you can swap between OpenAI, Anthropic, and open-source models without rewriting application code.

7. **Retry with feedback on failure.** When extraction fails, send the error back to the model and let it try again. This works surprisingly well.

---

## Try It Yourself

**Exercise: Build a Resume Parser**

Create a structured output pipeline that extracts data from plain-text resumes:

```javascript
const resumeSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    email: { type: ['string', 'null'] },
    phone: { type: ['string', 'null'] },
    summary: { type: ['string', 'null'] },
    skills: {
      type: 'array',
      items: { type: 'string' },
    },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          company: { type: 'string' },
          title: { type: 'string' },
          start_date: { type: ['string', 'null'] },
          end_date: { type: ['string', 'null'] },
          highlights: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['company', 'title', 'start_date', 'end_date', 'highlights'],
        additionalProperties: false,
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          institution: { type: 'string' },
          degree: { type: 'string' },
          year: { type: ['string', 'null'] },
        },
        required: ['institution', 'degree', 'year'],
        additionalProperties: false,
      },
    },
  },
  required: ['name', 'email', 'phone', 'summary', 'skills', 'experience', 'education'],
  additionalProperties: false,
};
```

1. Write 2-3 sample resumes as plain text (different formats, levels of detail)
2. Implement extraction using OpenAI Structured Outputs
3. Add content validation (check email format, ensure dates are reasonable)
4. Implement a retry mechanism for failed extractions
5. Compare results between GPT-4o and GPT-4o mini -- is the cheaper model good enough?

**Bonus**: Build a simple web form that lets you paste a resume and see the extracted JSON in real time, streamed to the page as it's generated.
