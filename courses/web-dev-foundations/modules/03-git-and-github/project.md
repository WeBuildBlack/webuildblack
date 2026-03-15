---
title: "Module Project: Collaboration Simulation"
estimatedMinutes: 60
---

# Module Project: Collaboration Simulation

In this project, you will simulate a real-world collaboration workflow by yourself. You will play the role of two developers working on the same project, creating branches, making changes, merging, resolving conflicts, and pushing everything to GitHub.

By the end, you will have a complete "About Me" web page on GitHub with a full commit history that demonstrates branching, merging, and conflict resolution. This is the kind of workflow you will use every day as a professional developer.

---

## What You Will Build

A simple "About Me" HTML page with three sections:

1. An introduction with your name and a short bio
2. A hobbies section listing things you enjoy
3. A contact section with ways to reach you

You will build each section on a separate branch and merge them together, just like a real team would divide work across team members.

---

## Before You Start

Make sure you have:

- Git installed and configured (Lesson 1)
- A GitHub account (Lesson 4)
- Your terminal open and ready

---

## Step 1: Create and Initialize the Repository

Create a new project folder and initialize a Git repository:

```bash
mkdir ~/about-me-project
cd ~/about-me-project
git init
```

Create a `.gitignore` file right away (good habit):

```bash
touch .gitignore
```

Open `.gitignore` in your text editor and add:

```
.DS_Store
Thumbs.db
.env
```

Stage and commit:

```bash
git add .gitignore
git commit -m "Add .gitignore file"
```

---

## Step 2: Create the Initial HTML Page

Create a file called `index.html`:

```bash
touch index.html
```

Open `index.html` in your text editor and add this starter HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About Me</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 700px;
            margin: 40px auto;
            padding: 0 20px;
            line-height: 1.6;
            color: #333;
            background-color: #fafafa;
        }

        h1 {
            color: #2C170B;
            border-bottom: 3px solid #AE8156;
            padding-bottom: 10px;
        }

        h2 {
            color: #7D4E21;
            margin-top: 30px;
        }

        .intro {
            font-size: 1.1em;
        }
    </style>
</head>
<body>
    <h1>About Me</h1>

    <div class="intro">
        <!-- TODO: Replace this paragraph with a short introduction about yourself. -->
        <!-- Include your name and 2-3 sentences about who you are. -->
        <p>Hi, my name is [YOUR NAME]. I am currently learning web development and building my skills with HTML, CSS, JavaScript, and Git.</p>
    </div>

</body>
</html>
```

Now personalize the page. Replace `[YOUR NAME]` with your actual name. Edit the intro paragraph to say something true about yourself. Make it yours.

Once you are happy with your introduction, stage and commit:

```bash
git add index.html
git commit -m "Add About Me page with introduction"
```

Verify your commits so far:

```bash
git log --oneline
```

You should see two commits.

---

## Step 3: Push to GitHub

1. Go to [github.com/new](https://github.com/new) and create a new repository called `about-me-project`.
2. Leave "Initialize this repository with a README" **unchecked**.
3. Click **"Create repository."**
4. Copy the HTTPS URL (it will look like `https://github.com/yourusername/about-me-project.git`).

Back in your terminal:

```bash
git remote add origin https://github.com/yourusername/about-me-project.git
git push -u origin main
```

Visit your GitHub repository page and verify your files appear. You should see `index.html` and `.gitignore`.

---

## Step 4: Create the Hobbies Branch

Now you will play the role of "Developer A" who is tasked with adding a hobbies section.

Create and switch to a new branch:

```bash
git checkout -b feature/add-hobbies
```

Open `index.html` and add a hobbies section below the closing `</div>` of the intro section (right before `</body>`):

```html
    <section>
        <h2>My Hobbies</h2>
        <!-- TODO: Replace these list items with your actual hobbies. -->
        <!-- List at least 4 hobbies or interests. Be specific! -->
        <!-- Instead of "music" try "producing beats in Ableton" -->
        <!-- Instead of "reading" try "reading sci-fi novels" -->
        <ul>
            <li>[HOBBY 1]</li>
            <li>[HOBBY 2]</li>
            <li>[HOBBY 3]</li>
            <li>[HOBBY 4]</li>
        </ul>
    </section>
```

Replace the `[HOBBY]` placeholders with your actual hobbies. Remove the TODO comments when you are done.

Stage and commit:

```bash
git add index.html
git commit -m "Add hobbies section with personal interests"
```

Good. The hobbies section now exists on the `feature/add-hobbies` branch, but `main` does not know about it yet. Leave this branch for now.

---

## Step 5: Create the Contact Branch

Now switch roles. You are "Developer B" who needs to add a contact section. But Developer B started from `main`, not from the hobbies branch. This is realistic. On a team, people branch off `main` independently.

Switch back to `main` first:

```bash
git checkout main
```

Take a look at `index.html` in your editor. Notice the hobbies section is gone. It only exists on the `feature/add-hobbies` branch. This is branches working exactly as they should.

Now create a new branch for the contact section:

```bash
git checkout -b feature/add-contact
```

Open `index.html` and add a contact section below the closing `</div>` of the intro section (right before `</body>`). This is the same location where the hobbies section was added on the other branch:

```html
    <section>
        <h2>Get in Touch</h2>
        <!-- TODO: Replace these with your actual contact info or social links. -->
        <!-- You don't have to use real info. Placeholder links are fine for practice. -->
        <p>Want to connect? Here is how to reach me:</p>
        <ul>
            <li>Email: <a href="mailto:you@example.com">[YOUR EMAIL]</a></li>
            <li>GitHub: <a href="https://github.com/yourusername">github.com/[YOUR USERNAME]</a></li>
            <li>LinkedIn: <a href="https://linkedin.com/in/yourprofile">linkedin.com/in/[YOUR PROFILE]</a></li>
        </ul>
    </section>
```

Fill in your details (or use placeholder info if you prefer). Remove the TODO comments.

Stage and commit:

```bash
git add index.html
git commit -m "Add contact section with links"
```

---

## Step 6: Merge the Contact Branch into Main

You are still on `feature/add-contact`. Let us merge it into `main`.

First, switch to `main`:

```bash
git checkout main
```

Now merge:

```bash
git merge feature/add-contact
```

This should be a clean **fast-forward merge** since `main` has not changed since you created the branch. You should see output like:

```
Updating xxxxxxx..xxxxxxx
Fast-forward
 index.html | X +++++++++
 1 file changed, X insertions(+)
```

Open `index.html` and verify the contact section is there. Run `git log --oneline` to see the merge in the history.

---

## Step 7: Merge the Hobbies Branch into Main

Now for the interesting part. The `feature/add-hobbies` branch was also created from `main`, but `main` has changed since then (we just merged the contact section). Both branches added content in the same area of the file.

Try the merge:

```bash
git merge feature/add-hobbies
```

One of two things will happen:

**If Git merges cleanly**: Git was able to figure out how to combine both sections. Check `index.html` to make sure both the hobbies and contact sections are present and the HTML looks correct. If so, you are done with this step.

**If you get a merge conflict**: You will see a message like:

```
Auto-merging index.html
CONFLICT (content): Merge conflict in index.html
Automatic merge failed; fix conflicts and then commit the result.
```

This is expected. Move on to Step 8.

If the merge was clean and there was no conflict, you can still practice Step 8 by checking that both sections appear properly. Either way, continue to Step 8.

---

## Step 8: Resolve the Merge Conflict

If you have a merge conflict, open `index.html` in your text editor. You will see conflict markers like this:

```html
<<<<<<< HEAD
    <section>
        <h2>Get in Touch</h2>
        <p>Want to connect? Here is how to reach me:</p>
        <ul>
            <li>Email: <a href="mailto:you@example.com">you@example.com</a></li>
            ...
        </ul>
    </section>
=======
    <section>
        <h2>My Hobbies</h2>
        <ul>
            <li>Producing beats in Ableton</li>
            ...
        </ul>
    </section>
>>>>>>> feature/add-hobbies
```

To resolve this, you want **both** sections in the final file. Remove the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) and arrange both sections so the page flows naturally. The hobbies section should come before the contact section:

```html
    <section>
        <h2>My Hobbies</h2>
        <ul>
            <li>Producing beats in Ableton</li>
            <!-- ... your other hobbies ... -->
        </ul>
    </section>

    <section>
        <h2>Get in Touch</h2>
        <p>Want to connect? Here is how to reach me:</p>
        <ul>
            <li>Email: <a href="mailto:you@example.com">you@example.com</a></li>
            <!-- ... your other contact info ... -->
        </ul>
    </section>
```

Make sure:

- All conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) are completely removed
- Both sections are present
- The HTML is valid (proper opening and closing tags)
- The page order makes sense: intro, hobbies, contact

Save the file. Then complete the merge:

```bash
git add index.html
git commit -m "Merge hobbies and contact sections"
```

Open `index.html` in your browser to verify it looks right. You should see your introduction, hobbies, and contact information all on one page.

---

## Step 9: Push the Final Version to GitHub

Push everything to GitHub:

```bash
git push
```

Visit your GitHub repository page and verify:

- All your files are there
- Your commit history shows the branches and merges
- `index.html` contains all three sections

---

## Step 10: Add a README

Every good repository needs a README. Create one:

```bash
touch README.md
```

Open `README.md` in your text editor and write a description of your project:

```markdown
# About Me Project

A simple personal web page built as part of the We Build Black Web Development
Foundations course. This project was used to practice Git and GitHub workflows
including branching, merging, and conflict resolution.

## What I Practiced

- Initializing a Git repository
- Making commits with descriptive messages
- Creating and switching between branches
- Merging branches
- Resolving merge conflicts
- Pushing to GitHub

## Technologies

- HTML5
- CSS3
- Git & GitHub

## Author

<!-- TODO: Replace with your name and GitHub profile link -->
Built by [Your Name](https://github.com/yourusername)
```

Replace the author information with your own details. Remove the TODO comment.

Stage, commit, and push:

```bash
git add README.md
git commit -m "Add README with project description"
git push
```

---

## Clean Up

Delete the merged branches:

```bash
git branch -d feature/add-hobbies
git branch -d feature/add-contact
```

Run `git log --oneline` to see your complete project history. You should see something like:

```
xxxxxxx Add README with project description
xxxxxxx Merge hobbies and contact sections
xxxxxxx Add hobbies section with personal interests
xxxxxxx Add contact section with links
xxxxxxx Add About Me page with introduction
xxxxxxx Add .gitignore file
```

That is a clean, professional-looking commit history. Each commit tells part of the story. Anyone looking at this repository can understand what was built and how it evolved.

---

## Stretch Goals

If you want to take this project further, try these challenges:

1. **Fork a classmate's repository**: Find someone else who has completed this project (or any public repository). Fork it on GitHub, clone the fork, make an improvement (fix a typo, add a section, improve the CSS), push your changes, and create a Pull Request. This is the open source workflow in action.

2. **Set up GitHub Pages**: Go to your repository's Settings, then Pages. Set the source to "Deploy from a branch," select `main` and `/ (root)`, and click Save. After a minute, your page will be live at `https://yourusername.github.io/about-me-project/`. You just deployed a website for free.

3. **Improve the design**: Add more CSS to make the page look polished. Try adding a profile image, custom fonts, or a color scheme. Commit each change on its own branch, merge it, and push.

4. **Add a navigation bar**: If you created additional HTML pages (like `hobbies.html` or `contact.html` instead of sections), add a nav bar that links between pages. Practice the branch-and-merge workflow for each addition.

---

## Submission Checklist

Before you consider this project complete, verify:

- [ ] Repository exists on GitHub and is public
- [ ] `index.html` has all three sections: introduction, hobbies, and contact
- [ ] The page displays correctly when opened in a browser
- [ ] `.gitignore` file is present
- [ ] `README.md` is present with a project description
- [ ] Commit history shows at least 5 commits
- [ ] Commit history shows at least 2 branches were created and merged
- [ ] All commit messages are descriptive and use imperative mood
- [ ] No merge conflict markers remain in any file
- [ ] All branches have been cleaned up (deleted after merging)

Congratulations. You have completed a full Git and GitHub workflow from start to finish. This is the same process used by development teams at companies of every size. You are building real, professional skills.
