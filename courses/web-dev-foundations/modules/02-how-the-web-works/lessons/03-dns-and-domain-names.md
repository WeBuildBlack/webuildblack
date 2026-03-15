---
title: "DNS and Domain Names"
estimatedMinutes: 30
---

# DNS and Domain Names

You already know that when you type `webuildblack.com` into your browser, it sends a request to a server somewhere. But how does your browser know *which* server? There are billions of devices on the internet. How does your computer find the exact right one?

The answer is a system called **DNS**, and it is one of the most important pieces of internet infrastructure that most people never think about. By the end of this lesson, you will understand exactly how your browser goes from a name like `webuildblack.com` to the right computer on the other side of the world.

---

## The Problem: Names vs. Numbers

Computers identify each other using **IP addresses**, numeric addresses like `142.250.80.46`. Every server on the internet has one. But humans are terrible at remembering long numbers. Quick: what is your best friend's phone number? Most of us cannot recite it because we just tap their name in our contacts.

That is exactly the problem DNS solves.

**Domain names** like `webuildblack.com` are human-friendly labels. **IP addresses** like `142.250.80.46` are computer-friendly addresses. We need a system to translate between the two.

---

## What Is DNS?

**DNS** stands for **Domain Name System**. It is the phone book of the internet.

Think about how a phone book works (or a contacts app, if you have never seen a physical phone book):

- You look up a person's **name** (the domain name)
- The phone book gives you their **phone number** (the IP address)
- You use that number to call them (your browser connects to the server)

DNS does this for every website on the internet. When you type `webuildblack.com`, DNS translates that into an IP address like `76.76.21.21`, and then your browser connects to that address.

Without DNS, you would have to memorize the IP address of every website you wanted to visit. Imagine typing `142.250.80.46` instead of `google.com` every time you wanted to search for something. DNS makes the web usable for humans.

---

## How a DNS Lookup Works

When you type a URL into your browser, a DNS lookup happens before your browser can send any HTTP request. Here is a simplified step-by-step of what happens:

```
  You type: webuildblack.com
      │
      ▼
  Step 1: Check browser cache
  "Have I looked this up recently?"
      │ No
      ▼
  Step 2: Check operating system cache
  "Has my computer looked this up recently?"
      │ No
      ▼
  Step 3: Ask the resolver (your ISP's DNS server)
  "Hey, do you know webuildblack.com?"
      │ No
      ▼
  Step 4: Ask the root name server
  "Who handles .com domains?"
      │ "Try the .com TLD server"
      ▼
  Step 5: Ask the .com TLD server
  "Who handles webuildblack.com?"
      │ "Try this authoritative name server"
      ▼
  Step 6: Ask the authoritative name server
  "What is the IP address for webuildblack.com?"
      │ "It's 76.76.21.21"
      ▼
  Your browser connects to 76.76.21.21
```

Let us walk through each step:

**Step 1: Browser cache.** Your browser remembers recent DNS lookups. If you visited `webuildblack.com` five minutes ago, the browser already knows the IP address and skips ahead. This is called **caching**, storing a result so you do not have to look it up again.

**Step 2: Operating system cache.** If the browser does not have it cached, it asks your computer's operating system. Your OS keeps its own cache of recent DNS lookups.

**Step 3: DNS resolver.** If your computer does not know either, it reaches out to a **DNS resolver**, usually a server run by your internet service provider (ISP) or a public DNS service like Google (8.8.8.8) or Cloudflare (1.1.1.1). The resolver is like a librarian. You ask a question, and they go find the answer for you.

**Step 4: Root name server.** If the resolver does not have the answer cached, it starts at the top of the DNS hierarchy: a **root name server**. There are 13 sets of root name servers around the world. The root server does not know the IP address of `webuildblack.com`, but it knows who handles `.com` domains and points the resolver in the right direction.

**Step 5: TLD name server.** The resolver asks the **.com TLD server** (TLD stands for Top-Level Domain). This server does not know the exact IP address either, but it knows which **authoritative name server** is responsible for `webuildblack.com`.

**Step 6: Authoritative name server.** Finally, the resolver asks the **authoritative name server** for `webuildblack.com`. This server has the definitive answer: "The IP address for webuildblack.com is 76.76.21.21." The resolver caches this answer and sends it back to your browser.

This whole process, all six steps, typically takes **20-120 milliseconds**. A fraction of a second. And most of the time, the answer is cached at step 1 or 2, so it is even faster.

---

## Domain Name Structure

Domain names have a specific structure. Let us break down `www.webuildblack.com`:

```
  www  .  webuildblack  .  com
   │         │             │
   │         │             └── Top-Level Domain (TLD)
   │         └── Second-Level Domain (your domain name)
   └── Subdomain
```

### Top-Level Domain (TLD)

The **TLD** is the last part of the domain name, the part after the final dot. Common TLDs include:

| TLD | Typical Use |
|-----|-------------|
| `.com` | Commercial websites (the most common) |
| `.org` | Non-profit organizations (like WBB) |
| `.net` | Network/technology companies |
| `.edu` | Educational institutions |
| `.gov` | Government agencies |
| `.io` | Tech startups (originally for Indian Ocean territory) |
| `.dev` | Developer tools and resources |

WBB uses `.com` (`webuildblack.com`), though as a non-profit, `.org` would also be a natural fit.

### Second-Level Domain

The **second-level domain** is the name you actually choose and register: `webuildblack`, `google`, `wikipedia`. This is the unique name that identifies your website.

### Subdomains

A **subdomain** goes in front of the main domain name. The most common subdomain is `www`, but you can create any subdomain you want:

- `www.webuildblack.com`: the main website
- `learn.webuildblack.com`: the learning platform
- `blog.webuildblack.com`: a blog (if one existed)

Subdomains are useful for organizing different sections or services under the same domain. They can each point to different servers. You do not have to buy a new domain name for each one. Subdomains come free with your domain.

---

## Registrars: Where You Buy Domain Names

When you want your own domain name, you buy it from a **domain registrar**. You are not really "buying" the name permanently. You are **renting** it, usually for one year at a time, and you renew it to keep it.

Popular domain registrars include:

- **Namecheap**: affordable, straightforward
- **Google Domains** (now Squarespace Domains): clean interface, integrates with Google services
- **Cloudflare Registrar**: sells domains at cost (no markup)
- **GoDaddy**: one of the oldest, lots of marketing

A `.com` domain typically costs **$10-15 per year**. Some specialty TLDs cost more, and premium domain names (short, common words) can cost thousands.

When you register a domain, you configure its **DNS records** to point to your server. That is how the domain name system knows where to send visitors. The registrar gives you a control panel to manage these settings.

---

## Hosting: Where Your Website Files Live

Owning a domain name is like owning a street address sign. You still need a **building**, a server to store your website files and serve them to visitors. This is called **web hosting**.

Hosting providers give you space on a server where your files live. When someone types your domain name, DNS resolves it to your hosting server's IP address, and the server sends your website files to their browser.

Some popular hosting options:

| Service | Best For | Cost |
|---------|---------|------|
| **Netlify** | Static websites (HTML/CSS/JS) | Free tier available |
| **Vercel** | React/Next.js apps | Free tier available |
| **GitHub Pages** | Simple project sites | Free |
| **DigitalOcean** | Full server control | Starting at $4/month |
| **AWS / Google Cloud** | Enterprise scale | Pay-as-you-go |

For this course, you will use free hosting options. The WBB main website uses Netlify, and the course platform uses Vercel. Both have generous free tiers that are perfect for learning and small projects.

---

## The Complete Journey: URL to Page

Let us put every concept from this module together and trace the full journey from the moment you type a URL to the moment you see a page. This is the complete picture.

**You type `https://webuildblack.com/programs/fast-track` and press Enter.**

```
  ┌──────────────────────────────────────────────────────────────┐
  │ 1. DNS LOOKUP                                                │
  │    Browser asks: "What IP address is webuildblack.com?"       │
  │    DNS answers: "76.76.21.21"                                │
  ├──────────────────────────────────────────────────────────────┤
  │ 2. TCP CONNECTION                                            │
  │    Browser connects to 76.76.21.21 on port 443 (HTTPS)       │
  │    Secure encrypted connection is established                 │
  ├──────────────────────────────────────────────────────────────┤
  │ 3. HTTP REQUEST                                              │
  │    GET /programs/fast-track HTTP/1.1                          │
  │    Host: webuildblack.com                                     │
  ├──────────────────────────────────────────────────────────────┤
  │ 4. SERVER PROCESSING                                         │
  │    Server finds the Fast Track page files                     │
  ├──────────────────────────────────────────────────────────────┤
  │ 5. HTTP RESPONSE                                             │
  │    HTTP/1.1 200 OK                                           │
  │    Content-Type: text/html                                    │
  │    Body: <!DOCTYPE html>...                                   │
  ├──────────────────────────────────────────────────────────────┤
  │ 6. BROWSER RENDERING                                         │
  │    Parse HTML → Build DOM → Load CSS → Load JS → Load images  │
  │    (Each resource = another request-response cycle)           │
  ├──────────────────────────────────────────────────────────────┤
  │ 7. PAGE DISPLAYED                                            │
  │    You see the Fast Track program page!                       │
  └──────────────────────────────────────────────────────────────┘
```

1. **DNS lookup.** Your browser converts `webuildblack.com` into the IP address `76.76.21.21`. It checks its cache first, then asks DNS servers if needed.

2. **Connection.** Your browser establishes a connection to the server at that IP address on port 443 (the standard port for HTTPS). They set up encryption so the conversation is private.

3. **HTTP request.** Your browser sends a GET request for `/programs/fast-track`, along with headers about your browser and preferences.

4. **Server processing.** The server at `76.76.21.21` receives the request, finds the right HTML file, and prepares a response.

5. **HTTP response.** The server sends back a response with status code 200 (success), headers describing the content, and the HTML in the body.

6. **Browser rendering.** Your browser parses the HTML, builds the DOM, discovers it needs CSS, JavaScript, and images, sends additional requests for each one, and assembles the final page.

7. **Page displayed.** You see the finished page on your screen. The entire process took less than a second.

Every website visit follows this exact same path. Now you understand all of it.

---

## Localhost: Your Computer as a Server

There is one special domain name you will use constantly as a web developer: **localhost**.

`localhost` always refers to **your own computer**. It is the equivalent of the IP address `127.0.0.1`. When you run a web server on your own machine for testing, you access it by visiting `http://localhost` in your browser.

You will typically see URLs like:

```
http://localhost:3000
http://localhost:8080
http://localhost:5500
```

The number after the colon is the port. It tells your browser which service on your computer to connect to. Different development tools use different ports.

When you type `http://localhost:3000`:
- `localhost` resolves to `127.0.0.1` (your own machine, no DNS lookup needed)
- `:3000` tells the browser to connect to port 3000
- Your browser sends a GET request to *itself*
- The development server running on your machine sends back a response

This means you do not need to be connected to the internet to develop a website. You can build and test everything locally, right on your own computer. You will start doing this in the HTML module.

---

## CDNs: Copies Closer to You

One last concept worth knowing: **CDNs**, or Content Delivery Networks.

Imagine the WBB website server is in New York. If someone in Tokyo visits the site, their request has to travel all the way across the Pacific Ocean and back. That adds delay.

A **CDN** solves this by making copies of your website files and putting them on servers all around the world, called **edge servers**. When someone in Tokyo visits, they get the files from a server in Tokyo (or somewhere nearby in Asia), not from New York. When someone in London visits, they get files from a European server.

```
  Without CDN:
  Tokyo user ────── long distance ──────► New York server

  With CDN:
  Tokyo user ────── short distance ──► Tokyo edge server (copy)
  London user ───── short distance ──► London edge server (copy)
  NYC user ──────── short distance ──► New York server (origin)
```

CDNs make websites faster for users around the world. Services like Netlify, Vercel, and Cloudflare include CDN functionality automatically. When you deploy a website to Netlify (which you will do later in this course), your site is automatically distributed to their CDN. No extra setup required.

---

## Key Takeaways

1. **DNS is the phone book of the internet.** It translates human-readable domain names (like `webuildblack.com`) into numeric IP addresses that computers use to find each other.
2. **DNS lookups follow a hierarchy**: browser cache, OS cache, resolver, root server, TLD server, authoritative server. Caching makes most lookups nearly instant.
3. **Domain names have a structure**: subdomain (optional) + second-level domain (your chosen name) + TLD (.com, .org, etc.).
4. **You rent domain names from registrars** like Namecheap or Cloudflare, typically for about $10-15 per year.
5. **Hosting is where your files live.** Services like Netlify and Vercel offer free tiers perfect for learning and small projects.
6. **The full journey** (DNS lookup, connection, request, response, rendering) happens every time you visit any website, usually in under a second.
7. **Localhost (127.0.0.1) is your own computer.** You will use it constantly for local development and testing without needing an internet connection.

---

## Try It Yourself

1. **DNS lookup in action.** Open your terminal and run:
   ```
   nslookup webuildblack.com
   ```
   This shows you the DNS server that answered and the IP address it returned. Try it with a few websites you visit often. Do any share the same IP address?

2. **Break down domain names.** For each of these URLs, identify the subdomain (if any), the second-level domain, and the TLD:
   - `https://www.wikipedia.org`
   - `https://learn.webuildblack.com`
   - `https://docs.github.com`
   - `https://mail.google.com`
   - `https://developer.mozilla.org`

3. **Explore TLDs.** Visit [IANA's TLD list](https://data.iana.org/TLD/tlds-alpha-by-domain.txt) to see how many top-level domains exist. Were you surprised by the number? Pick three TLDs you have never seen and look up what they are for.

4. **Check a registrar.** Go to a domain registrar like Namecheap (namecheap.com) and search for a domain name you think would be fun to own (do not buy it unless you want to). How much does it cost? Is the `.com` version available? What about `.org` or `.dev`?

5. **Map the full journey.** In your own words (or as a drawing/diagram), map the complete path from typing a URL to seeing a page. Include DNS lookup, HTTP request and response, and browser rendering. This is the single most important concept from this entire module. Make sure you can explain it.
