---
title: "Git Basics: Init, Add, and Commit"
estimatedMinutes: 45
---

# Git Basics: Init, Add, and Commit

In the last lesson, you learned *what* version control is and *why* it matters. You installed Git and configured it with your name and email. Now it is time to actually use it.

This lesson covers the core Git workflow: the commands you will use dozens of times every single day as a developer. By the end, you will be able to create a Git repository, track changes, and save snapshots of your work. These are the fundamental building blocks of everything else in Git.

Time to get to it.

---

## Creating a Repository: `git init`

A **repository** (or "repo" for short) is just a project folder that Git is tracking. To start tracking a folder with Git, you use `git init`.

Let us create a practice project. Open your terminal and use the commands you learned in Module 01:

```bash
mkdir ~/git-practice
cd ~/git-practice
```

Now, initialize a Git repository:

```bash
git init
```

You should see:

```
Initialized empty Git repository in /Users/yourname/git-practice/.git/
```

That is it. Your `git-practice` folder is now a Git repository. Git is watching this folder, ready to track any changes you make.

### The .git Folder

When you ran `git init`, Git created a hidden folder called `.git` inside your project. You can see it with:

```bash
ls -a
```

```
.  ..  .git
```

This `.git` folder is Git's brain. It stores all of your project's history, configuration, and tracking information. There is one important rule about this folder: **do not touch it.** Do not delete it, do not edit files inside it, do not rename it. If you delete the `.git` folder, you delete your entire project history.

You will never need to go inside this folder. Just know it exists and leave it alone.

---

## Checking Status: `git status`

If there is one Git command you should burn into your memory, it is this one:

```bash
git status
```

`git status` tells you what is going on in your repository right now. What files have changed? What files are staged? What files are new? Run it early, run it often.

Try it now in your empty repository:

```bash
git status
```

```
On branch main

No commits yet

nothing to commit (create/copy files and use "git add" to track)
```

Git is telling you three things:

1. You are on the `main` branch (we will cover branches in Lesson 3).
2. There are no commits yet (you have not saved any snapshots).
3. There is nothing to commit (no files exist in the project yet).

Give Git something to work with. Create a file:

```bash
touch index.html
```

Now check the status again:

```bash
git status
```

```
On branch main

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	index.html

nothing added to commit but untracked files present (use "git add" to track)
```

Git sees the new file, but it is listed under **Untracked files**. That means Git knows the file exists, but it is not tracking it yet. Git does not automatically track every file in your folder. You have to tell it which files you want to track.

This is by design. There will be files in your project (like system files, temporary files, or files containing passwords) that you do *not* want Git to track. We will cover that later in this lesson with `.gitignore`.

---

## The Three States: Modified, Staged, Committed

Remember the three stages from the last lesson: Working Directory, Staging Area, Repository. Your files move through **three states** that correspond to those stages:

1. **Modified.** You have changed the file, but have not told Git about it yet. The change only exists in your working directory.
2. **Staged.** You have marked the changed file to be included in your next commit. It is in the staging area, ready to go.
3. **Committed.** The change has been saved as a snapshot in your repository. It is on the permanent record.

Every file in a Git repository is in one of these states. The `git status` command tells you which state each file is in.

---

## Staging Files: `git add`

To move a file from "untracked" or "modified" to "staged," you use `git add`:

```bash
git add index.html
```

Now check the status:

```bash
git status
```

```
On branch main

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
	new file:   index.html
```

The file has moved from "Untracked files" to "Changes to be committed." It is now in the **staging area**. It is in the envelope, sealed, and ready to be mailed.

### Adding Multiple Files

If you have several files to stage, you can add them one by one:

```bash
git add file1.html
git add file2.css
git add file3.js
```

Or, you can add all changed files at once with a dot:

```bash
git add .
```

The dot (`.`) means "everything in the current directory." This is convenient, but use it carefully. Make sure you are not accidentally staging files you do not want to track.

Create a couple more files so we can practice:

```bash
echo "body { margin: 0; }" > styles.css
echo "console.log('hello');" > script.js
```

Check the status:

```bash
git status
```

```
On branch main

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
	new file:   index.html

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	script.js
	styles.css
```

See how `index.html` is staged (under "Changes to be committed") but `styles.css` and `script.js` are still untracked? Add them all:

```bash
git add .
git status
```

```
On branch main

No commits yet

Changes to be committed:
  (use "git rm --cached <file>..." to unstage)
	new file:   index.html
	new file:   script.js
	new file:   styles.css
```

All three files are now staged and ready to be committed.

---

## Making Commits: `git commit`

A **commit** is a snapshot of your project at a specific moment in time. It is the "drop the envelope in the mailbox" step. Once you commit, that snapshot is saved in your repository's history.

To create a commit, use `git commit -m` followed by a message describing what changed:

```bash
git commit -m "Add initial project files"
```

```
[main (root-commit) a1b2c3d] Add initial project files
 3 files changed, 2 insertions(+)
 create mode 100644 index.html
 create mode 100644 script.js
 create mode 100644 styles.css
```

You just made your first commit. Here is what happened:

- `git commit` tells Git to save a snapshot of everything in the staging area.
- `-m "Add initial project files"` is the **commit message**, a short description of what this commit does.
- Git shows you a summary: 3 files changed, 2 lines inserted, and the short hash (`a1b2c3d`) that uniquely identifies this commit.

Check the status again:

```bash
git status
```

```
On branch main
nothing to commit, working tree clean
```

"Working tree clean" means all your changes have been committed. There is nothing new or modified. Your working directory and your repository are in sync.

---

## Writing Good Commit Messages

Your commit message is a note to your future self (and your teammates). A good commit message explains **what** the commit does and sometimes **why**.

Here are the rules for writing good commit messages:

**Use imperative mood.** Write your message as if you are giving a command. Think of it as completing the sentence "This commit will..."

Good:
- "Add navigation bar to homepage"
- "Fix broken link on about page"
- "Update CSS styles for mobile layout"
- "Remove unused JavaScript file"

Bad:
- "Added navigation bar" (past tense)
- "Adding navigation bar" (present participle)
- "I added a nav bar" (first person)
- "stuff" (meaningless)
- "asdfasdf" (come on now)

**Keep it short.** Aim for 50 characters or less. If you need to explain more, that is what the commit body is for (you will learn about that later).

**Be specific.** "Fix bug" is not helpful. "Fix login button not responding on mobile" tells you exactly what happened.

Your commit messages tell the story of your project. Six months from now, you will look back at your commit history to understand what changed and why. Make those messages count.

---

## Viewing History: `git log`

You can see all your commits with `git log`:

```bash
git log
```

```
commit a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0 (HEAD -> main)
Author: Jasmine Williams <jasmine.williams@email.com>
Date:   Fri Mar 14 10:30:00 2026 -0500

    Add initial project files
```

Each commit entry shows:

- The **commit hash**: a long string of characters that uniquely identifies this commit
- The **author**: who made the commit (this is why we configured `user.name` and `user.email`)
- The **date**: when the commit was made
- The **message**: what the commit does

Let us make a few more commits so we have a more interesting history. Open `index.html` in your text editor and add some content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Practice Page</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h1>Hello, World!</h1>
    <p>This is my Git practice project.</p>
    <script src="script.js"></script>
</body>
</html>
```

Save the file, then stage and commit:

```bash
git add index.html
git commit -m "Add HTML structure to index page"
```

Now update `styles.css`:

```css
body {
    margin: 0;
    font-family: Arial, sans-serif;
    background-color: #f5f5f5;
    color: #333;
}

h1 {
    color: #2C170B;
    text-align: center;
    padding: 20px;
}
```

Stage and commit:

```bash
git add styles.css
git commit -m "Add base styles and heading color"
```

Now check the log:

```bash
git log --oneline
```

```
c3d4e5f Add base styles and heading color
b2c3d4e Add HTML structure to index page
a1b2c3d Add initial project files
```

The `--oneline` flag shows a compact version: just the short hash and the message. This is much easier to scan when you have many commits. Notice how the commits are listed **newest first** (top to bottom).

You can see the full story of your project: you created the files, then added HTML structure, then added styles. Each step is recorded.

---

## The Staging Area in Depth: Why Does It Exist?

You might be wondering: why do we need the staging area at all? Why not just go straight from editing to committing?

Here is an analogy. Imagine you are **packing a suitcase** for a trip. You have a pile of clothes on your bed (your working directory). You could just stuff everything into the suitcase at once, but that would be messy. Instead, you pick out specific items and place them in the suitcase one by one. You fold them, arrange them, make sure you have what you need.

The staging area is like packing your suitcase. It lets you **choose exactly which changes** go into each commit.

Why does this matter? Say you spent an hour working on your project. During that hour, you:

1. Fixed a typo in the heading
2. Added a completely new contact section
3. Changed the background color

Those are three separate changes. They should be three separate commits, each with its own message. The staging area lets you do this:

```bash
# Stage and commit just the typo fix
git add index.html
git commit -m "Fix typo in page heading"

# Stage and commit the new section
git add index.html
git commit -m "Add contact section to homepage"

# Stage and commit the color change
git add styles.css
git commit -m "Change background color to light gray"
```

Each commit is clean, focused, and describes one change. This makes your project history easy to read and easy to undo if something goes wrong.

---

## Seeing What Changed: `git diff`

Before you stage your changes, you might want to see exactly what you changed. The `git diff` command shows you a line-by-line comparison of what is different.

Let us try it. Open `index.html` and change the heading text:

```html
<h1>Hello, Git!</h1>
```

Save the file, then run:

```bash
git diff
```

```
diff --git a/index.html b/index.html
index 1234567..abcdefg 100644
--- a/index.html
+++ b/index.html
@@ -7,7 +7,7 @@
 </head>
 <body>
-    <h1>Hello, World!</h1>
+    <h1>Hello, Git!</h1>
     <p>This is my Git practice project.</p>
     <script src="script.js"></script>
 </body>
```

Lines starting with `-` (and shown in red in your terminal) are what was **removed**. Lines starting with `+` (shown in green) are what was **added**. Here, Git shows that you replaced "Hello, World!" with "Hello, Git!"

`git diff` only shows changes that are **not yet staged**. Once you run `git add`, the changes move to the staging area and will not show up in `git diff` anymore. To see staged changes, use:

```bash
git diff --staged
```

Stage and commit this change:

```bash
git add index.html
git commit -m "Update heading text to reference Git"
```

---

## Ignoring Files: `.gitignore`

Not every file in your project should be tracked by Git. Some files you want to keep out:

- **System files** like `.DS_Store` (macOS) or `Thumbs.db` (Windows). These are created by your operating system and have nothing to do with your code.
- **Dependencies** like `node_modules/`. These are packages that can be reinstalled from a list. They are often thousands of files and would bloat your repository.
- **Secret files** like `.env`. These contain passwords, API keys, and other sensitive information that should never be shared publicly.
- **Build output** like `dist/` or `build/`. These are generated files that can be recreated from your source code.

To tell Git to ignore specific files or folders, you create a file called `.gitignore` in the root of your project.

Let us create one:

```bash
touch .gitignore
```

Open `.gitignore` in your text editor and add these common patterns:

```
# Operating system files
.DS_Store
Thumbs.db

# Dependencies
node_modules/

# Environment variables (secrets!)
.env
.env.local

# Build output
dist/
build/

# Editor files
.vscode/
*.swp
```

Lines starting with `#` are comments. Each other line is a pattern that Git will ignore. The `/` at the end of `node_modules/` means "ignore this entire folder."

Let us test it. Create a file that should be ignored:

```bash
touch .DS_Store
git status
```

```
On branch main
Untracked files:
  (use "git add <file>..." to include in what will be committed)
	.gitignore

```

Notice that `.DS_Store` does **not** appear in the untracked files list. Git is ignoring it, exactly as we told it to. The `.gitignore` file itself *does* appear, because we want to track it. Your teammates need to know what files to ignore too.

Let us commit the `.gitignore` file:

```bash
git add .gitignore
git commit -m "Add .gitignore file"
```

A `.gitignore` file should be one of the first things you create in any new project. Get in the habit.

---

## The Complete Workflow

Let us put it all together. Here is the Git workflow you will use every day:

```
1. Edit your files        (working directory)
2. git status             (see what changed)
3. git diff               (review the specific changes)
4. git add <files>        (stage the changes you want to commit)
5. git status             (confirm what is staged)
6. git commit -m "msg"    (save the snapshot)
7. git log --oneline      (verify the commit was recorded)
```

That is the cycle. Edit, check, stage, commit. Over and over. It becomes second nature very quickly.

---

## Quick Reference

Here is a cheat sheet of every command you learned in this lesson:

| Command | What It Does |
|---------|-------------|
| `git init` | Initialize a new Git repository |
| `git status` | See the current state of your files |
| `git add <file>` | Stage a specific file |
| `git add .` | Stage all changed files |
| `git commit -m "msg"` | Save a snapshot with a message |
| `git log` | View commit history (full) |
| `git log --oneline` | View commit history (compact) |
| `git diff` | See unstaged changes |
| `git diff --staged` | See staged changes |

---

## Key Takeaways

1. `git init` creates a new Git repository in your current folder. Run it once per project.
2. `git status` is your best friend. Run it constantly to see what state your files are in.
3. Files move through three states: **modified** (changed), **staged** (ready to commit), and **committed** (saved).
4. `git add` moves files to the staging area; `git commit -m` saves a snapshot to the repository.
5. Write commit messages in **imperative mood** ("Add feature" not "Added feature") and keep them short and specific.
6. `.gitignore` tells Git which files to skip. Always create one to keep system files, secrets, and dependencies out of your repository.
7. The basic daily workflow is: **edit, status, diff, add, commit, log.**

---

## Try It Yourself

Practice the full workflow from scratch:

1. Create a new folder called `git-exercise` and navigate into it.
2. Initialize a Git repository with `git init`.
3. Create a file called `notes.txt` and add a few lines of text to it (anything you want).
4. Run `git status` to see the untracked file.
5. Stage the file with `git add notes.txt`.
6. Run `git status` again to see it in the staging area.
7. Commit with `git commit -m "Add notes file"`.
8. Open `notes.txt` and add a few more lines.
9. Run `git diff` to see what changed.
10. Stage and commit with a descriptive message.
11. Run `git log --oneline` to see your commit history.
12. Create a `.gitignore` file that ignores `.DS_Store` and `.env` files. Stage and commit it.
13. Verify with `git log --oneline` that you now have three commits.

If you can do all thirteen steps without looking back at the lesson, you have got this down. If not, that is completely fine. Go back, reread the relevant section, and try again. Repetition is how these commands become muscle memory.
