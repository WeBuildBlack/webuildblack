---
title: "Deploying to the Web"
estimatedMinutes: 40
---

# Deploying to the Web

Your portfolio is built. It works in your browser. It looks good on mobile and desktop. The dark mode toggle remembers your preference. The form validates correctly. Your Git history tells the story of how you built it.

Now it is time for the most exciting step: putting it on the internet.

When you are done with this lesson, your portfolio will have a live URL that you can share with anyone in the world. That is not an exaggeration. Anyone with an internet connection will be able to type your URL into their browser and see the site you built from scratch.

Let's make it happen.

---

## How Deployment Works

Before you deploy, let's make sure you understand what is actually happening. You learned about this in Module 02 (How the Web Works) and now you are experiencing it firsthand.

Right now, your portfolio files (`index.html`, `styles.css`, `main.js`) live on your computer. When you open `index.html` in your browser, the browser reads the file directly from your hard drive. No server is involved. No one else can access it.

Deployment means uploading your files to a **web server**, a computer that is always connected to the internet, always powered on, and configured to respond to HTTP requests. When someone visits your URL, their browser sends an HTTP request (just like you learned in Module 02), the server finds your `index.html` file, and sends it back as an HTTP response. The browser then requests your CSS and JS files, renders the page, and your visitor sees your portfolio.

The great news: you do not need to set up your own server. Free hosting services handle all of this for you. You upload your files, they give you a URL, and you are live.

---

## Option 1: GitHub Pages (Recommended)

GitHub Pages is the easiest way to deploy a static website, and it is completely free. Since you already know Git and GitHub from Module 03, this is the natural choice.

GitHub Pages works by serving files directly from a GitHub repository. Every time you push changes, your site updates automatically. It is version-controlled deployment. Your Git skills are now DevOps skills.

### Step 1: Push Your Repository to GitHub

If you have not already pushed your portfolio to GitHub, do it now. You know the drill from Module 03:

1. Go to [github.com](https://github.com) and create a new repository. Name it `portfolio` (or whatever you prefer). Do not initialize it with a README since you already have one.

2. Connect your local repository to GitHub and push:

```bash
git remote add origin https://github.com/yourusername/portfolio.git
git branch -M main
git push -u origin main
```

3. Refresh the GitHub page. You should see all your files: `index.html`, `css/`, `js/`, `images/`, and your `README.md`.

### Step 2: Enable GitHub Pages

1. In your repository on GitHub, click **Settings** (the gear icon in the top menu).
2. In the left sidebar, click **Pages**.
3. Under **Source**, select **Deploy from a branch**.
4. Under **Branch**, select **main** and leave the folder as **/ (root)**.
5. Click **Save**.

That is it. GitHub will build and deploy your site. It usually takes 30 seconds to a minute.

### Step 3: Visit Your Live Site

Your site will be available at:

```
https://yourusername.github.io/portfolio/
```

Replace `yourusername` with your actual GitHub username and `portfolio` with your repository name.

Open that URL in your browser. Your portfolio is live on the internet. Take a moment to appreciate what you just did. You built a website from nothing and put it on the internet.

### Automatic Updates

From now on, every time you push to the `main` branch, GitHub Pages will automatically redeploy your site. The workflow is:

```bash
# Make changes to your files
git add .
git commit -m "feat: update project descriptions"
git push
```

Wait about a minute, refresh your site, and your changes are live. This is continuous deployment, a concept professional teams use every day, and you are already doing it.

### Custom Domain (Optional)

If you own a custom domain (like `yourname.com`), you can connect it to GitHub Pages:

1. In your repository's **Settings > Pages** section, enter your custom domain under **Custom domain**.
2. At your domain registrar (where you bought the domain), add DNS records:
   - For an apex domain (`yourname.com`): Add four A records pointing to GitHub's IP addresses (listed in the [GitHub Pages documentation](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)).
   - For a subdomain (`www.yourname.com`): Add a CNAME record pointing to `yourusername.github.io`.
3. Back in GitHub Pages settings, check **Enforce HTTPS** (GitHub provides a free SSL certificate).

DNS changes can take a few hours to propagate. Be patient. Once it works, you will have a professional URL for your portfolio.

---

## Option 2: Netlify

Netlify is another excellent free hosting option. It offers a few features that GitHub Pages does not, including form handling (which means your contact form could actually send emails), custom redirects, and instant rollbacks.

### The Quick Way: Drag and Drop

The fastest way to deploy on Netlify:

1. Go to [app.netlify.com](https://app.netlify.com) and create a free account.
2. From your dashboard, you will see a section that says "Want to deploy a new site without connecting to Git? Drag and drop your site output folder here."
3. Open your file manager, grab your entire portfolio folder, and drag it into the browser.
4. Netlify will upload your files, assign a random URL (like `https://wonderful-nightingale-a1b2c3.netlify.app`), and your site is live in seconds.

This is great for testing, but for ongoing updates, connect your Git repository instead.

### The Better Way: Git-Connected Deploys

1. Go to [app.netlify.com](https://app.netlify.com) and click **Add new site > Import an existing project**.
2. Choose **GitHub** as your Git provider and authorize Netlify to access your repositories.
3. Select your portfolio repository.
4. Configure the build settings:
   - **Branch to deploy**: `main`
   - **Build command**: leave blank (you have no build step, it is a static site)
   - **Publish directory**: `.` (the root of your repo, since `index.html` is at the top level)
5. Click **Deploy site**.

Netlify will deploy your site and give you a URL. Like GitHub Pages, it will automatically redeploy whenever you push to `main`.

### Customizing Your Netlify URL

That random URL is not great for a portfolio. You can change it:

1. Go to **Site settings > Domain management > Custom domains**.
2. Click **Options > Edit site name**.
3. Choose something like `yourname.netlify.app`.

Now your portfolio is at `https://yourname.netlify.app`. Much more professional.

### Netlify Forms (Bonus)

Netlify can handle your contact form submissions for free. Add a `netlify` attribute to your form tag:

```html
<form class="contact__form" id="contact-form" netlify novalidate>
```

Netlify will detect this during deployment and automatically set up form handling. Submissions will appear in your Netlify dashboard. You can even set up email notifications. Your JavaScript validation still works as a client-side first line of defense. Netlify handles the server-side submission.

---

## Option 3: Vercel

Vercel is another free option, especially popular with React and Next.js projects. For a static HTML/CSS/JS site, the process is similar to Netlify:

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account.
2. Click **Add New > Project** and import your portfolio repository.
3. Leave all settings at their defaults and click **Deploy**.

Vercel will give you a URL like `https://portfolio-yourusername.vercel.app`. Like the other platforms, it redeploys automatically on push.

Vercel is a solid choice, but for a static portfolio site, GitHub Pages or Netlify are usually the simplest options. You might come back to Vercel when you start building with frameworks like React or Next.js.

---

## Buying a Custom Domain (Optional)

A custom domain like `yourname.com` or `yourname.dev` is the most professional way to present your portfolio. It is not required (`yourusername.github.io/portfolio` works perfectly fine) but if you want to invest in your professional presence, a domain is worth it.

### Where to Buy

- **[Namecheap](https://namecheap.com)**: Great prices, clean interface, often the cheapest option for `.com` and `.dev` domains.
- **[Porkbun](https://porkbun.com)**: Low prices, free WHOIS privacy, very developer-friendly.
- **[Cloudflare Registrar](https://www.cloudflare.com/products/registrar/)**: Sells domains at cost (no markup), plus you get Cloudflare's DNS and CDN features.
- **[Google Domains](https://domains.google)**: Simple and reliable, integrates well with other Google services.

### Typical Costs

- `.com` domains: $10-15 per year
- `.dev` domains: $12-15 per year (requires HTTPS, which is a good thing)
- `.io` domains: $30-50 per year (more expensive, popular in tech)
- `.me` domains: $10-20 per year (great for personal sites)

### Connecting Your Domain

Once you buy a domain, you need to update its DNS settings to point to your hosting provider. The exact steps depend on your registrar and host, but the general process is:

1. Log in to your domain registrar.
2. Find the DNS settings for your domain.
3. Add the records your hosting provider specifies (A records for GitHub Pages, CNAME for a subdomain on Netlify or Vercel).
4. Back on your hosting platform, enter your custom domain in the settings.
5. Enable HTTPS (free on all three platforms).
6. Wait for DNS to propagate (usually a few hours, sometimes up to 48 hours).

Do not let the DNS stuff intimidate you. It is a one-time setup, and every hosting provider has step-by-step guides specific to their platform.

---

## Post-Deployment Checklist

Your site is live. Before you share it with the world, run through this checklist:

### Test on a Real Mobile Device

Desktop browser DevTools are great for previewing mobile layouts, but nothing replaces testing on an actual phone. Open your portfolio URL on your phone and check:

- Does the navigation work? Does the hamburger menu open and close?
- Is the text readable without zooming?
- Are the project cards stacked in a single column?
- Does the contact form work?
- Does the dark mode toggle work?

### Check All Links

Click every link on your site:

- Do navigation links scroll to the correct sections?
- Do project links go to the right GitHub repositories and live sites?
- Do social media links in the footer open the correct profiles?
- Does the "Back to Top" link work?

A broken link on a portfolio site is like a typo on a resume. Fix it.

### Run a Lighthouse Audit

Google Lighthouse is built into Chrome DevTools and it grades your site on Performance, Accessibility, Best Practices, and SEO:

1. Open your live portfolio in Google Chrome.
2. Open DevTools (right-click > Inspect, or press F12).
3. Click the **Lighthouse** tab.
4. Select **Mobile** and check all categories.
5. Click **Analyze page load**.

Lighthouse will give you scores out of 100 and specific suggestions for improvement. Aim for:

- **Performance**: 90+ (your site is small and static, so this should be achievable)
- **Accessibility**: 90+ (if you followed the semantic HTML and ARIA practices in this course, you are on track)
- **Best Practices**: 90+
- **SEO**: 90+

If any score is below 90, read the recommendations and fix what you can. This is a learning exercise in itself. Lighthouse teaches you what the industry considers best practice.

### Test Form Submission

Submit your contact form with valid data. Does the success message appear? Try submitting with empty fields. Do the error messages appear correctly? Try entering an invalid email. Does the validation catch it?

If you are using Netlify Forms, check your Netlify dashboard to confirm submissions are arriving.

### Ask a Friend for Feedback

Share your URL with someone: a classmate, a friend, a family member, someone in the WBB Slack community. Ask them:

- Is it clear what you do within five seconds?
- Is anything confusing or hard to find?
- Does anything look broken on their device?

Fresh eyes catch things you have become blind to after hours of building.

---

## Adding Your Portfolio to Your Professional Profiles

Your portfolio is live. Now make sure people can find it.

### Resume

Add your portfolio URL to the header of your resume, right alongside your email, phone number, and LinkedIn:

```
Your Name
youremail@example.com | linkedin.com/in/yourname | yourname.github.io/portfolio
```

### LinkedIn

1. Go to your LinkedIn profile.
2. Click the pencil icon to edit your intro section.
3. In the **Website** field, add your portfolio URL.
4. Consider adding a post announcing your portfolio: "Excited to share my new portfolio site! Built from scratch with HTML, CSS, and JavaScript. Check it out: [link]"

### GitHub

1. Go to your GitHub profile page.
2. Click **Edit profile**.
3. Add your portfolio URL in the **Website** field.
4. Pin your portfolio repository so it appears at the top of your profile.

### Twitter / X

Add your portfolio URL to your bio. If you tweet about what you are learning or building, your followers can easily find your work.

---

## Share With the WBB Community

You are part of a community of builders. Share your accomplishment:

- Post your portfolio link in the We Build Black Slack workspace. Let people know you finished the course and built your portfolio.
- Ask for feedback. The community has experienced developers who can offer constructive suggestions.
- Celebrate your peers. When someone else shares their portfolio, check it out, leave encouragement, and share it with your network.

We grow together. Your success is the community's success.

---

## What to Learn Next

You have finished this course, but your learning journey is just getting started. Here is a roadmap for where to go next:

### Deepen Your JavaScript

You have a solid JavaScript foundation. Next steps:

- **Async JavaScript**: Learn `fetch()`, Promises, and `async/await` to work with APIs (loading real data into your projects).
- **ES6+ features**: Destructuring, spread operator, template literals, modules. These are modern JavaScript patterns used in every professional codebase.
- **Data structures and algorithms**: Start practicing on platforms like LeetCode, HackerRank, or Codewars. This is essential for technical interviews.

### Learn a Framework

Once your JavaScript is solid, pick a front-end framework:

- **React**: The most popular front-end library. Huge job market, massive ecosystem, used by Meta, Netflix, Airbnb.
- **Vue.js**: Known for being approachable and well-documented. Great for developers coming from vanilla JavaScript.
- **Angular**: Used heavily in enterprise applications. Steeper learning curve, but very powerful.

React is the most common recommendation for job seekers because it has the most job postings, but any of these will serve you well.

### Explore the Backend

You have built the front-end. The backend is the other half of web development:

- **Node.js**: Run JavaScript on the server. You already know the language. Now learn how to use it for APIs, databases, and server-side logic.
- **Databases**: Learn SQL (PostgreSQL, MySQL) for relational data or MongoDB for document-based data.
- **APIs**: Build your own REST APIs that your front-end applications can communicate with.

### Version Control and Collaboration

You know Git basics. Level up:

- **Branching strategies**: Learn feature branches, pull requests, and code reviews.
- **Open source**: Contribute to open source projects. Start with issues labeled "good first issue" on GitHub. This builds your skills, your resume, and your network.

### We Build Black Programs

Continue your journey with We Build Black:

- **Fast Track**: A workforce development program with mentorship, milestones, and stipends. If you are ready to accelerate your career, Fast Track is designed for exactly that.
- **The Bridge**: An 8-week interview accountability program. If you are preparing for technical interviews, The Bridge provides structure, community, and coaching.
- **Mavens I/O Conference**: WBB's annual conference for the Black tech community. Attend for networking, learning, and inspiration.
- **Other courses**: Check [learn.webuildblack.com](https://learn.webuildblack.com) for new courses, including AI Engineering for Web Developers.

Keep building. Keep learning. Keep connecting with your community.

---

## You Did It

This is real. You started this course with no coding experience. You learned how to use a terminal. You learned how the internet works. You learned Git. You wrote HTML, styled it with CSS, made it responsive, and brought it to life with JavaScript.

And now you have a portfolio website, your own website, live on the internet, with your name, your story, and your projects. You built it yourself, every line.

That is not a small thing. That is the foundation of a career in tech. Everything you build from here grows on top of what you have already proven you can do.

Welcome to the web. You belong here.

---

## Key Takeaways

1. Deployment means uploading your files to a web server so anyone on the internet can access them. The HTTP request/response cycle from Module 02 in action.
2. GitHub Pages is the simplest deployment option for static sites: push to GitHub, enable Pages in settings, and your site is live in under a minute.
3. Netlify offers bonus features like form handling and instant rollbacks, and supports both drag-and-drop and Git-connected deploys.
4. A custom domain costs $10-15 per year and is worth the investment for a professional online presence, but it is not required.
5. Post-deployment testing is essential: check on real mobile devices, verify all links, run a Lighthouse audit, and get feedback from real humans.
6. Add your portfolio URL to your resume, LinkedIn, GitHub profile, and social media bios to maximize its impact.
7. This is the beginning, not the end. Keep building, keep learning, and stay connected with the We Build Black community.

---

## Try It Yourself

1. **Deploy your portfolio.** Choose GitHub Pages or Netlify and follow the steps in this lesson to deploy your site. Verify it works by visiting the live URL on both your computer and your phone.

2. **Run a Lighthouse audit.** Open your live site in Chrome, run a Lighthouse audit on mobile, and screenshot your scores. If any category is below 90, read the recommendations and fix at least two issues. Redeploy and retest.

3. **Update your professional profiles.** Add your portfolio URL to your GitHub profile, LinkedIn, and resume. If you have a Twitter/X account, add it to your bio there too.

4. **Share it.** Post your portfolio link in the WBB Slack community. Congratulate yourself. Then go look at what your classmates built and leave encouraging feedback.
