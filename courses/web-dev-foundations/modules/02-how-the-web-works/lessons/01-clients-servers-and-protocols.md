---
title: "Clients, Servers, and Protocols"
estimatedMinutes: 35
---

# Clients, Servers, and Protocols

Every time you open a website, something remarkable happens behind the scenes. In less than a second, your computer reaches out across the world, finds the right machine, asks for specific files, receives them, and assembles them into the page you see. Understanding this process is one of the most empowering things you can do as a new developer. It takes the web from feeling like magic to feeling like something you can build and control.

In this lesson, we are going to break down exactly what happens when you visit a website. No prior knowledge required. If you have ever ordered food at a restaurant, you already understand the core concept.

---

## The Internet vs. the Web

People use "the internet" and "the web" interchangeably, but they are actually two different things.

**The internet** is a massive global network of computers connected to each other. Think of it like the road system: highways, streets, and bridges that connect cities and towns. The internet has been around since the late 1960s, long before websites existed. Email, file transfers, and video calls all travel over the internet.

**The web** (short for World Wide Web) is a service that runs *on top of* the internet. It is a collection of websites and web pages that you access through a browser. Think of the web like the stores, restaurants, and offices that sit along those roads. The roads (internet) were there first. The buildings (websites) came later.

Here is the key distinction:

- **Internet** = the network infrastructure (the roads)
- **Web** = the websites and pages you visit using that infrastructure (the buildings along the roads)

When you build a website, you are building something that lives on the web, which travels over the internet. You will be working with both, but it helps to know they are separate things.

---

## The Client-Server Model

The web runs on a simple idea called the **client-server model**. Here is how it works, using a restaurant analogy.

Imagine you walk into a restaurant:

1. **You (the client)** sit down and look at the menu
2. **You place an order** with the waiter: "I would like the grilled salmon, please"
3. **The waiter carries your order** back to the kitchen
4. **The kitchen (the server)** prepares your meal
5. **The waiter brings your food** back to your table
6. **You enjoy your meal**

Now translate that to the web:

1. **Your browser (the client)** opens up and you type in a web address
2. **Your browser sends a request** over the network: "I would like the homepage of webuildblack.com, please"
3. **The network carries your request** across the internet
4. **The web server** finds the right files (HTML, CSS, images)
5. **The network carries the files** back to your browser
6. **Your browser displays the page**

That is the entire model. One side asks (the client), the other side answers (the server), and the network connects them.

### What Is a Client?

A **client** is any device or program that requests information. Your web browser (Chrome, Firefox, Safari, Edge) is the most common client. But a mobile app checking the weather or a smart TV loading Netflix are also clients. Anything that asks a server for data is a client.

The key thing about clients: they *initiate* the conversation. The server just sits there waiting until a client asks for something.

### What Is a Server?

A **server** is a computer that stores files and sends them to clients when asked. That is it. A server is not some mysterious, special machine. It is a regular computer, often sitting in a data center somewhere, running software that listens for incoming requests and responds to them.

When someone says "I need to set up a server," they mean "I need a computer running software that can receive and respond to requests."

The word "server" comes from "to serve." It *serves* files to whoever asks for them, just like a kitchen serves food to whoever orders.

---

## Protocols: The Rules of Communication

When you walk into that restaurant, you and the waiter both speak the same language. You know to place an order, the waiter knows to write it down and bring it to the kitchen. There are shared rules and expectations that make the interaction work.

On the web, these shared rules are called **protocols**. A protocol is a set of rules that both the client and server agree to follow so they can communicate. Without protocols, your browser would send a request in one format and the server would have no idea how to read it.

### HTTP and HTTPS

The protocol that powers the web is called **HTTP**, which stands for **HyperText Transfer Protocol**. Every time you visit a website, your browser uses HTTP to communicate with the server.

**HTTPS** is the secure version of HTTP. The "S" stands for **Secure**. When you see `https://` at the beginning of a web address, it means the communication between your browser and the server is **encrypted**, scrambled so that no one in between can read it.

Think of it this way:

- **HTTP** is like sending a postcard. Anyone who handles it along the way could read the message
- **HTTPS** is like sending a sealed, locked envelope. Only the intended recipient can open it

Today, most websites use HTTPS. Browsers will actually warn you when a site only uses HTTP. Any site where you enter a password, credit card number, or personal information should absolutely be HTTPS.

---

## URLs: The Addresses of the Web

Every website has an address, just like every building has a street address. On the web, these addresses are called **URLs** (Uniform Resource Locators).

Let us break down a URL piece by piece:

```
https://www.webuildblack.com/programs/fast-track?cohort=2026#apply
```

| Part | Example | What It Does |
|------|---------|-------------|
| **Protocol** | `https://` | The rules for communication (HTTP or HTTPS) |
| **Subdomain** | `www.` | A subsection of the main domain (optional) |
| **Domain** | `webuildblack.com` | The name of the website |
| **Path** | `/programs/fast-track` | The specific page or resource on that site |
| **Query string** | `?cohort=2026` | Extra information sent to the server (like search filters) |
| **Fragment** | `#apply` | A specific section on the page to scroll to |

Not every URL has all of these parts. Many are simpler:

```
https://webuildblack.com/about
```

That is just a protocol, domain, and path. But now when you see a long, complicated URL, you can break it down and understand each piece.

---

## IP Addresses: Every Computer's Unique Number

Every computer connected to the internet has a unique address called an **IP address** (Internet Protocol address). It is like a phone number. It uniquely identifies that specific machine on the network.

IP addresses look like this:

```
142.250.80.46
```

That is four numbers separated by dots, each between 0 and 255. This format is called **IPv4**. There is also a newer format called **IPv6** that looks more complex (like `2607:f8b0:4004:800::200e`), but the concept is the same. It is a unique identifier for a computer.

Here is why this matters: when you type `webuildblack.com` into your browser, your browser does not actually know where that is. It needs to convert that human-friendly name into a numeric IP address that computers understand. We will cover exactly how that happens in the DNS lesson coming up next.

---

## Ports: Apartment Numbers for Computers

One more concept that is helpful to understand: **ports**.

If an IP address is like a building's street address, a **port** is like an apartment number within that building. A single computer (one IP address) can run many different services (a web server, an email server, a database) and each one listens on a different port.

Some common ports:

| Port | Service |
|------|---------|
| 80 | HTTP (regular web traffic) |
| 443 | HTTPS (secure web traffic) |
| 22 | SSH (secure remote access) |

When you visit `https://webuildblack.com`, your browser automatically connects to port 443 because that is the standard port for HTTPS. You do not have to type it. The browser figures it out from the protocol.

Later in this course, when you run a website on your own computer for testing, you will see URLs like `http://localhost:3000`. That `:3000` is the port number. It tells your browser exactly which service on your computer to connect to.

---

## A Day in the Life of a Web Request

Let us put it all together. Here is the complete story of what happens when you type `https://webuildblack.com` into your browser and press Enter:
![Client Server Architecture](/courses/assets/images/client-server.png)


**Step 1: You type the URL and press Enter.** Your browser sees that you want `https://webuildblack.com` and begins preparing a request.

**Step 2: Your browser looks up the IP address.** It converts the domain name `webuildblack.com` into a numeric IP address so it knows which computer on the internet to contact. (We will cover DNS, the system that handles this, in the next lesson.)

**Step 3: Your browser establishes a connection.** It reaches out to the server at that IP address on port 443 (because HTTPS) and sets up a secure, encrypted connection.

**Step 4: Your browser sends an HTTP request.** The request says, "Please send me the homepage." It includes some extra information about your browser and what kinds of files it can handle.

**Step 5: The server processes the request.** The server receives your request, finds the right files (the HTML for the homepage, the CSS for styling, images, and any JavaScript) and packages them up.

**Step 6: The server sends an HTTP response.** The response includes a status code (200 means "everything is OK"), some metadata, and the actual files.

**Step 7: Your browser receives and renders the page.** It reads the HTML to understand the structure, applies the CSS to make it look right, runs the JavaScript for interactivity, and downloads any images. In less than a second, you see the finished page.

**Step 8: Your browser may make additional requests.** As it reads the HTML, it discovers it needs more files: images, fonts, scripts. It sends separate requests for each one. A single page load might involve 20, 50, or even 100+ individual requests.

And all of that happens in the blink of an eye. Every single time you visit any website.

---

## Key Takeaways

1. **The internet is the network infrastructure; the web is the collection of websites that run on it.** They are related but separate things.
2. **The client-server model is the foundation of the web.** Clients (your browser) ask for things, servers send them back, and the network connects them.
3. **HTTP and HTTPS are the protocols**, the shared rules, that clients and servers use to communicate. HTTPS encrypts the conversation for security.
4. **A URL is a web address** made up of parts: protocol, domain, path, query string, and fragment. Each part has a purpose.
5. **IP addresses are unique numeric identifiers** for computers on the internet. Domain names are the human-friendly versions.
6. **Ports are like apartment numbers.** They direct traffic to the right service on a computer.
7. **A single page load involves multiple steps**: DNS lookup, connection, request, response, rendering, and often dozens of individual requests.

---

## Try It Yourself

Open your browser right now and try these exercises:

1. **Examine a URL.** Go to any website you use regularly. Look at the URL in the address bar. Can you identify the protocol, domain, and path? Does it have a query string or fragment?

2. **Check for HTTPS.** Visit five websites you use often. Do they all use HTTPS? Look for the lock icon in the address bar. If any use plain HTTP, what does your browser say about it?

3. **See an IP address.** Open your terminal (you learned how in Module 01) and type:
   ```
   ping webuildblack.com
   ```
   You will see the IP address that the domain name resolves to. Try it with a few different websites. Press `Ctrl+C` to stop the ping.

4. **Find a port in action.** Look for a URL that includes a port number (like `localhost:3000` or `localhost:8080`). If you do not have one yet, that is okay. You will see these when we start building websites later in the course.

5. **Trace the journey.** Pick a website you visited today. In your own words, write out the steps that happened between you typing the URL and seeing the page. Use the "Day in the Life" section above as a guide, but put it in your own words.
