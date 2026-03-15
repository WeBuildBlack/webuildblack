---
title: "GitHub and Remote Repositories"
estimatedMinutes: 45
---

# GitHub and Remote Repositories

Up to this point, everything you have done with Git has been on your own computer. Your commits, your branches, your entire project history. All stored locally. That works great for tracking changes, but it has two big limitations:

1. **No backup.** If your computer crashes, your project and all its history are gone.
2. **No collaboration.** If you want to work with other people, they have no way to access your code.

This is where **GitHub** comes in. In this lesson, you will learn how to put your code on the internet, collaborate with others, and start building your developer profile. This is where Git goes from a personal tool to a professional superpower.

---

## What Is GitHub?

**GitHub** is a website that hosts Git repositories online. Think of it as a social network for code. It lets you:

- **Back up** your projects to the cloud
- **Share** your code with anyone in the world
- **Collaborate** with teammates on the same project
- **Showcase** your work to potential employers

Remember the analogy from Lesson 1: Git is the word processor, GitHub is Google Drive. Git tracks your changes locally. GitHub stores them online and adds collaboration features on top.

GitHub is free to use. You can have unlimited public repositories (visible to everyone) and unlimited private repositories (visible only to people you invite). The free tier is more than enough for everything in this course and beyond.

There are other platforms like GitHub (GitLab and Bitbucket are the main alternatives), but GitHub is by far the most popular. When employers and recruiters look at developers' profiles, they look at GitHub. That is where we will focus.

---

## Creating a GitHub Account

If you do not already have a GitHub account, head to [github.com](https://github.com) and sign up. A few tips:

- **Choose your username carefully.** This will be part of your professional identity. Keep it clean, recognizable, and ideally close to your real name or a professional handle. Avoid things like "xXxCoderBoi420xXx."
- **Use the same email** you configured Git with. This ensures your local commits get linked to your GitHub profile.
- **Pick the free plan.** It has everything you need.

Once you are signed up and logged in, you are ready to create your first repository on GitHub.

---

## Creating a Repository on GitHub

Click the green **"New"** button on your GitHub dashboard (or go to [github.com/new](https://github.com/new)).

Fill in the details:

- **Repository name**: `git-practice` (match your local project name)
- **Description**: "My first Git repository" (optional but helpful)
- **Public or Private**: Choose **Public** for now. You want people to see your work
- **Initialize with a README**: Leave this **unchecked** (you already have a local repo, and we will connect it)

Click **"Create repository."**

GitHub will show you a page with setup instructions. You will see a URL that looks something like:

```
https://github.com/yourusername/git-practice.git
```

Keep this page open. You will need that URL in the next step.

---

## Connecting Your Local Repo to GitHub

You have a local Git repository on your computer. You have a repository on GitHub. Now you need to connect them. The connection between your local repo and an online repo is called a **remote**.

Navigate to your local project in the terminal:

```bash
cd ~/git-practice
```

Add GitHub as a remote:

```bash
git remote add origin https://github.com/yourusername/git-practice.git
```

Let us break this down:

- `git remote add`: "I want to add a remote connection"
- `origin`: the name for this remote (a convention, as "origin" is the standard name for your primary remote)
- `https://github.com/...`: the URL of your GitHub repository

You can verify the remote was added:

```bash
git remote -v
```

```
origin  https://github.com/yourusername/git-practice.git (fetch)
origin  https://github.com/yourusername/git-practice.git (push)
```

Your local repo now knows about your GitHub repo. They are connected.

---

## Pushing Code to GitHub

**Pushing** means sending your local commits to GitHub. Think of it like uploading your files to the cloud, except Git is smart. It only uploads the changes, not the entire project every time.

```bash
git push -u origin main
```

Let us break this down:

- `git push`: "send my commits to the remote"
- `-u`: "set this as the default remote for this branch" (you only need this flag the first time)
- `origin`: which remote to push to
- `main`: which branch to push

You may be prompted for your GitHub username and password. If so, for the password, you will need to use a **Personal Access Token** instead of your actual password (GitHub no longer accepts passwords for Git operations). To create one:

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name like "git-practice"
4. Check the "repo" scope
5. Click "Generate token"
6. Copy the token and use it as your password

After pushing, go to your GitHub repository page in your browser and refresh. You should see all your files and commit history right there on the web. Your code is now backed up online.

From now on, after the initial push with `-u`, you can simply use:

```bash
git push
```

Git remembers the default remote and branch.

---

## Cloning a Repository

What if you want to download someone else's project from GitHub (or your own project onto a different computer)? That is called **cloning**.

```bash
git clone https://github.com/someuser/their-project.git
```

This command:

1. Creates a new folder with the repository name
2. Downloads all the files
3. Downloads the entire commit history
4. Automatically sets up the remote connection to GitHub

Let us try it. Navigate to a different folder and clone your own repo:

```bash
cd ~/Desktop
git clone https://github.com/yourusername/git-practice.git git-practice-clone
```

```
Cloning into 'git-practice-clone'...
remote: Enumerating objects: 15, done.
remote: Counting objects: 100% (15/15), done.
remote: Compressing objects: 100% (10/10), done.
Receiving objects: 100% (15/15), done.
```

The second argument (`git-practice-clone`) is an optional custom folder name. If you leave it off, it uses the repo name.

Now you have two copies of your project: the original in `~/git-practice` and the clone on your Desktop. Both are connected to the same GitHub repository.

---

## Pulling Changes

If someone else pushes changes to GitHub (or you push from a different computer), your local copy will be behind. To download the latest changes, use `git pull`:

```bash
git pull
```

```
Already up to date.
```

Right now there is nothing new to pull, so Git says "Already up to date." But in a collaborative project, `git pull` is how you stay in sync with your team.

Here is a good habit: **always pull before you start working.** This ensures you have the latest version of the code before you start making changes. The daily workflow becomes:

```
1. git pull              (get latest changes)
2. git checkout -b feature  (create a branch)
3. ... do your work ...
4. git add + git commit  (save your work)
5. git push              (share your work)
```

---

## The Fork and Clone Workflow

So far, you have been working with your own repositories. But one of the most powerful things about GitHub is contributing to **other people's projects**.

Open source software (code that anyone can view, use, and improve) runs on GitHub. The Linux operating system, the Python programming language, millions of tools and libraries: they are all on GitHub, and anyone can contribute.

Here is how you contribute to a project you do not own:

### Step 1: Fork

Go to the project's GitHub page and click the **"Fork"** button in the top right. This creates a copy of the repository under your own GitHub account. You now have your own version that you can modify freely.

### Step 2: Clone Your Fork

Clone your fork (not the original) to your computer:

```bash
git clone https://github.com/yourusername/forked-project.git
cd forked-project
```

### Step 3: Make Changes

Create a branch, make your changes, commit them:

```bash
git checkout -b fix/typo-in-readme
# ... make your changes ...
git add .
git commit -m "Fix typo in README introduction"
```

### Step 4: Push to Your Fork

```bash
git push -u origin fix/typo-in-readme
```

### Step 5: Create a Pull Request

This is the big one, and it deserves its own section.

---

## Pull Requests: The Heart of Collaboration

A **Pull Request** (or **PR**) is how you propose changes to a project. It is like raising your hand and saying, "Hey, I made some improvements. Want to review them and add them to the project?"

Pull requests are central to how teams work together. Even if you are working on your own project, PRs are a best practice because they create a record of what changed and why.

### Creating a Pull Request

After pushing your branch to GitHub:

1. Go to your repository on GitHub.
2. You will see a banner that says something like "fix/typo-in-readme had recent pushes" with a green **"Compare & pull request"** button. Click it.
3. Fill in the PR form:
   - **Title**: A short description of what this PR does (like a commit message). Example: "Fix typo in README introduction"
   - **Description**: More detail about what you changed and why. For bigger changes, explain your approach and any decisions you made.
4. Click **"Create pull request."**

### Reviewing a Pull Request

On the PR page, you (or your teammates) can:

- **See the code changes.** GitHub shows a line-by-line comparison of what was added and removed (just like `git diff`, but in a nice visual format).
- **Leave comments.** You can comment on specific lines of code, ask questions, or suggest improvements.
- **Approve or request changes.** On team projects, PRs usually need at least one approval before they can be merged.

### Merging a Pull Request

Once a PR is reviewed and approved, you merge it by clicking the green **"Merge pull request"** button on GitHub. This is the same as running `git merge` locally, but it happens on GitHub.

After merging, you can delete the branch (GitHub offers a button for this too).

Then, back on your local machine, pull the changes:

```bash
git checkout main
git pull
```

Your local `main` branch now has the merged changes.

### Why Pull Requests Matter

- **Code review.** Someone else checks your work before it goes into the main codebase. This catches bugs, improves code quality, and helps everyone learn.
- **Documentation.** PRs create a paper trail. You can look back months later and understand why a change was made.
- **Discussion.** PRs are a place to have technical conversations about the best approach to a problem.
- **Safety.** Nothing goes into `main` without being reviewed. This keeps the main branch stable.

---

## GitHub Pages: Free Website Hosting

Here is something exciting: GitHub can host a website for you, for free. It is called **GitHub Pages**, and it works with static HTML, CSS, and JavaScript files, exactly what you will be building in this course.

We will not set it up in detail now (that is part of the capstone project in Module 10), but here is the quick version:

1. Push your HTML/CSS/JS files to a GitHub repository.
2. Go to the repository's Settings → Pages.
3. Select your branch (usually `main`) and folder (usually `/ (root)`).
4. Click Save.
5. GitHub gives you a URL like `https://yourusername.github.io/your-repo-name/`.

Your website is live on the internet. Free. No hosting fees, no server setup, no complicated deployment process. This is how many developers host their portfolio sites, and it is how you will deploy your capstone project.

---

## README.md: Your Project's Front Door

Every GitHub repository should have a **README.md** file. This is the first thing people see when they visit your repository. It is displayed right on the main page.

A good README includes:

- **Project name and description**: what does this project do?
- **How to use it**: installation instructions, how to run it
- **Screenshots**: if it is a visual project, show what it looks like
- **Technologies used**: what tools and languages are involved
- **Contributing**: how others can contribute (for open source projects)

The `.md` extension stands for **Markdown**, a simple formatting language you will see everywhere in the developer world. Here is a quick example:

```markdown
# My Portfolio Website

A personal portfolio site built with HTML, CSS, and JavaScript.

## Features

- Responsive design that works on mobile and desktop
- Project showcase section
- Contact form

## Technologies

- HTML5
- CSS3
- JavaScript

## How to Run

1. Clone this repository
2. Open `index.html` in your browser

## Author

Built by [Your Name](https://github.com/yourusername)
```

`#` creates headings (more `#` symbols = smaller headings), `-` creates bullet lists, and `**text**` makes text bold. You will pick up Markdown quickly. It is used for GitHub READMEs, documentation, and even the lesson files in this course.

Create a README for your practice project:

```bash
cd ~/git-practice
touch README.md
```

Add some content describing your project, then stage and commit:

```bash
git add README.md
git commit -m "Add README with project description"
git push
```

Check your GitHub repository page. You will see the README rendered beautifully below your file list.

---

## Your GitHub Profile as a Portfolio

Here is something important for everyone in this community, especially those working toward careers in tech: **your GitHub profile is your portfolio.**

When you apply for jobs, hiring managers and recruiters will look at your GitHub. They want to see:

- **Consistency.** Are you coding regularly? Green squares on your contribution graph show activity.
- **Real projects.** Not just tutorials, but projects you built yourself.
- **Clean code.** Good commit messages, organized files, README files that explain your work.
- **Collaboration.** Pull requests, code reviews, contributions to other projects.

You do not need hundreds of repositories. A handful of well-built, well-documented projects is much more impressive than 50 empty repos with "initial commit" as the only commit message.

Start building your GitHub profile now. Every project you create in this course is a potential portfolio piece. Commit often, write good messages, and push to GitHub.

---

## SSH Keys vs. HTTPS

You may have noticed that when you push to GitHub, it asks for your credentials. There are two ways to authenticate:

**HTTPS** (what we have been using):
- URL looks like: `https://github.com/user/repo.git`
- Authenticates with your username and a Personal Access Token
- Easier to set up for beginners

**SSH**:
- URL looks like: `git@github.com:user/repo.git`
- Authenticates with a cryptographic key pair stored on your computer
- No need to enter credentials every time once set up
- More secure and preferred by experienced developers

For now, stick with HTTPS. It is simpler and works perfectly fine. When you are comfortable with Git and want to level up, setting up SSH keys is a great next step. GitHub has excellent documentation on how to do it: [docs.github.com/en/authentication](https://docs.github.com/en/authentication).

---

## Quick Reference

Here is a cheat sheet of the GitHub-related commands from this lesson:

| Command | What It Does |
|---------|-------------|
| `git remote add origin URL` | Connect your local repo to GitHub |
| `git remote -v` | See your remote connections |
| `git push -u origin main` | Push to GitHub (first time) |
| `git push` | Push to GitHub (after first time) |
| `git clone URL` | Download a repository from GitHub |
| `git pull` | Download latest changes from GitHub |

---

## The Complete Professional Workflow

Putting together everything from all four lessons, here is the full workflow that professional developers use daily:

```
1. git pull                         (sync with team)
2. git checkout -b feature/my-task  (create a branch)
3. ... write code ...
4. git status                       (check what changed)
5. git add <files>                  (stage changes)
6. git commit -m "descriptive msg"  (commit)
7. git push -u origin feature/my-task  (push branch to GitHub)
8. Open a Pull Request on GitHub    (propose changes)
9. Get review, merge the PR         (changes go to main)
10. git checkout main && git pull   (sync locally)
11. git branch -d feature/my-task   (clean up)
```

This loop repeats for every task, every feature, every bug fix. It might feel like a lot of steps now, but it becomes automatic with practice. You have just learned a workflow used by developers at every tech company in the world.

---

## Key Takeaways

1. **GitHub** is a website that hosts Git repositories online. It provides backup, collaboration, and visibility for your code.
2. `git remote add origin URL` connects your local repository to GitHub; `git push` uploads your commits.
3. `git clone URL` downloads a repository from GitHub; `git pull` syncs the latest changes.
4. **Pull requests** are how you propose and review changes. They are the foundation of team collaboration.
5. **GitHub Pages** lets you host a website for free directly from a GitHub repository.
6. Every repository should have a **README.md** that explains what the project is and how to use it.
7. Your **GitHub profile is your portfolio.** Build it intentionally, commit consistently, and write clear READMEs.

---

## Try It Yourself

Complete this end-to-end workflow:

1. If you do not have a GitHub account yet, create one at [github.com](https://github.com).
2. Create a new repository on GitHub called `git-practice`. Do **not** initialize it with a README.
3. In your terminal, navigate to your local `git-practice` project.
4. Connect it to GitHub: `git remote add origin https://github.com/yourusername/git-practice.git`
5. Push your code: `git push -u origin main`
6. Visit your GitHub repository page and verify all your files and commits appear.
7. Create a `README.md` file locally with a title and description of the project. Commit it.
8. Push the README to GitHub: `git push`
9. Refresh the GitHub page and verify the README appears below the file list.
10. On a different folder (like your Desktop), clone the repo: `git clone https://github.com/yourusername/git-practice.git git-practice-v2`
11. Navigate into `git-practice-v2` and run `git log --oneline` to verify the full history is there.
12. **Bonus**: Create a branch in the clone, make a change, push it, and create a Pull Request on GitHub. Merge it. Then go back to your original folder and run `git pull` to get the changes.

You just completed a full professional Git and GitHub workflow. This is the exact process you will use in every job, every open source contribution, and every team project. You should feel proud. This is a major milestone.
