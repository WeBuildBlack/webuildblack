---
title: "Branching and Merging"
estimatedMinutes: 45
---

# Branching and Merging

You now know how to create a repository, track files, and make commits. That is powerful on its own, but Git has another feature that takes things to a completely different level: **branches**.

Branches are what make Git truly essential for professional development. They let you experiment, build new features, and fix bugs, all without touching the working version of your project. In this lesson, you will learn how to create branches, switch between them, merge them together, and handle the conflicts that sometimes arise when changes overlap.

---

## What Are Branches?

Here is an analogy. Imagine you are writing a novel. You have your main manuscript, the "official" version that you are happy with so far. Now you want to try rewriting Chapter 3 in a completely different style. But you do not want to mess up the original. What do you do?

You make a **photocopy** of the manuscript. Now you have two copies:

- The **original**: your official version, untouched
- The **photocopy**: your experimental version, where you can try anything

If the experimental rewrite turns out great, you replace Chapter 3 in the original with your new version. If it turns out terrible, you throw away the photocopy. Either way, your original manuscript was never at risk.

That is exactly what branches do in Git. A **branch** is a separate line of development, a parallel universe where you can make changes without affecting the main version of your project.

The key difference from a photocopy: Git branches are incredibly lightweight. Creating a branch takes milliseconds and almost no disk space. You are not copying your entire project. Git is just creating a new pointer to the current state of your code. This means you should create branches freely and often.

---

## The Main Branch

When you create a Git repository with `git init`, Git automatically creates a branch called `main`. This is your default branch, the "official" version of your project.

You can see which branch you are on with:

```bash
git branch
```

```
* main
```

The asterisk (`*`) indicates which branch you are currently on. Right now, `main` is the only branch, so it is the one with the asterisk.

Think of `main` as the trunk of a tree. All other branches grow out from it, and eventually their changes come back to it.

---

## Creating a Branch

Let us create a branch. First, make sure you are in the `git-practice` project from the last lesson (or create a new one with `git init` and a few commits).

To create a new branch:

```bash
git branch add-about-page
```

This creates a new branch called `add-about-page`. Let us verify:

```bash
git branch
```

```
  add-about-page
* main
```

You can see both branches listed, but the asterisk is still next to `main`. Creating a branch does not switch you to it. You are still on `main`.

### Branch Naming Tips

Branch names should describe what you are working on. Some common conventions:

- `add-about-page`: adding a new feature
- `fix-header-alignment`: fixing a bug
- `update-footer-links`: updating existing content
- `feature/navigation`: some teams prefix with a category

Keep names lowercase, use hyphens instead of spaces, and be descriptive. "test" or "branch2" tells you nothing.

---

## Switching Branches

To switch to your new branch, use `git checkout`:

```bash
git checkout add-about-page
```

```
Switched to branch 'add-about-page'
```

Verify you are on the new branch:

```bash
git branch
```

```
* add-about-page
  main
```

The asterisk has moved. You are now on `add-about-page`.

### The Shortcut: Create and Switch in One Step

In practice, you almost always want to create a branch and immediately switch to it. There is a shortcut for that:

```bash
git checkout -b new-branch-name
```

The `-b` flag means "create this branch, then switch to it." This is the command most developers use day-to-day. There is also a newer command that does the same thing:

```bash
git switch -c new-branch-name
```

Both work. Use whichever you prefer. In this course, we will use `git checkout -b` since it is more widely used and recognized.

---

## Making Commits on a Branch

Now that you are on the `add-about-page` branch, any commits you make will only exist on this branch. The `main` branch will not be affected at all.

Let us create a new file:

```bash
touch about.html
```

Add some content to `about.html` in your text editor:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>About Me</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h1>About Me</h1>
    <p>Welcome to my about page. I am learning Git!</p>
</body>
</html>
```

Stage and commit:

```bash
git add about.html
git commit -m "Add about page"
```

Now here is where it gets interesting. Switch back to `main`:

```bash
git checkout main
```

Run `ls`:

```bash
ls
```

```
index.html  script.js  styles.css
```

Where did `about.html` go? It is not in your folder anymore! Do not panic. It is safe. The file exists on the `add-about-page` branch. When you switched to `main`, Git updated your working directory to match the state of `main`, and `about.html` does not exist on `main` yet.

Switch back to the branch:

```bash
git checkout add-about-page
ls
```

```
about.html  index.html  script.js  styles.css
```

There it is. `about.html` is back. Each branch has its own version of your project. When you switch branches, Git swaps out the files in your working directory to match. It is like flipping between parallel universes.

---

## Merging: Bringing Changes Together

You have built your about page on a separate branch. You are happy with it. Now you want to bring those changes into `main`, to make them "official."

This is called **merging**. You merge one branch *into* another.

Here is the process: first, switch to the branch you want to merge **into** (the destination). Then run `git merge` with the name of the branch you want to merge **from** (the source).

```bash
# Step 1: Switch to the destination branch
git checkout main

# Step 2: Merge the source branch into it
git merge add-about-page
```

```
Updating b2c3d4e..f5e6d7c
Fast-forward
 about.html | 12 ++++++++++++
 1 file changed, 12 insertions(+)
 create mode 100644 about.html
```

Now check:

```bash
ls
```

```
about.html  index.html  script.js  styles.css
```

The `about.html` file is now on `main`. Your changes have been merged. Check the log:

```bash
git log --oneline
```

You will see the "Add about page" commit is now part of `main`'s history.

### Fast-Forward Merges

You may have noticed Git said "Fast-forward" when it merged. This is the simplest type of merge. It happens when the branch you are merging has new commits, but `main` has not changed since you branched off.

Think of it like this: you left the main road to take a detour. While you were on the detour, no one else was on the main road. So when you come back, Git can just "fast-forward" the main road to include your detour. No complications.

### Three-Way Merges

Sometimes, `main` *has* changed while you were working on your branch. Maybe a teammate merged their own branch, or you made a quick fix directly on `main`. In this case, Git has to combine the two sets of changes. This is called a **three-way merge** (Git looks at three things: the common ancestor, your branch, and the other branch).

Git handles three-way merges automatically most of the time. It creates a special "merge commit" that ties the two branches together. You will see this in practice soon.

---

## Merge Conflicts: When Changes Collide

Sometimes, two branches change **the same lines** in **the same file**. When this happens, Git cannot automatically decide which version to keep. This is called a **merge conflict**.

Merge conflicts sound scary, but they are completely normal. They happen regularly on any team project. The good news: they are straightforward to resolve once you know what to look for.

Let us create a merge conflict on purpose so you can see how it works.

### Step 1: Set Up the Conflict

Make sure you are on `main`:

```bash
git checkout main
```

Open `index.html` and change the paragraph:

```html
<p>This is my portfolio website.</p>
```

Save, stage, and commit:

```bash
git add index.html
git commit -m "Update description to portfolio"
```

Now create a new branch and switch to it:

```bash
git checkout -b update-description
```

Open `index.html` and change that **same paragraph** to something different:

```html
<p>This is my personal website for showcasing projects.</p>
```

Save, stage, and commit:

```bash
git add index.html
git commit -m "Update description to project showcase"
```

### Step 2: Trigger the Conflict

Switch back to `main` and try to merge:

```bash
git checkout main
git merge update-description
```

```
Auto-merging index.html
CONFLICT (content): Merge conflict in index.html
Automatic merge failed; fix conflicts and then commit the result.
```

Git is telling you: "I tried to merge, but both branches changed the same line and I do not know which one you want. You need to fix this."

### Step 3: Read the Conflict Markers

Open `index.html` in your text editor. You will see something like this:

```html
<body>
    <h1>Hello, Git!</h1>
<<<<<<< HEAD
    <p>This is my portfolio website.</p>
=======
    <p>This is my personal website for showcasing projects.</p>
>>>>>>> update-description
    <script src="script.js"></script>
</body>
```

These are **conflict markers**. Here is what they mean:

- `<<<<<<< HEAD`: marks the start of the conflict. Everything between here and `=======` is **your current branch's version** (in this case, `main`).
- `=======`: the divider between the two versions.
- `>>>>>>> update-description`: marks the end of the conflict. Everything between `=======` and here is **the other branch's version**.

### Step 4: Resolve the Conflict

To resolve the conflict, you need to:

1. **Choose** which version you want (or combine them)
2. **Remove** all the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
3. **Save** the file

Let us say you want to combine both ideas. Edit the file to look like this:

```html
<body>
    <h1>Hello, Git!</h1>
    <p>This is my portfolio website for showcasing projects.</p>
    <script src="script.js"></script>
</body>
```

Notice: all three conflict markers are gone, and you wrote a sentence that combines the best of both versions. You are in complete control of the final result.

### Step 5: Complete the Merge

After resolving the conflict in your editor, save the file. Then stage it and commit:

```bash
git add index.html
git commit -m "Merge update-description and combine descriptions"
```

That is it. The merge conflict is resolved. Check `git log --oneline` and you will see the merge commit at the top.

### Conflict Resolution Tips

- **Do not panic.** Conflicts are normal. They are not errors. They are Git asking for your input.
- **Read the markers carefully.** Look at what each branch changed and decide what the final version should be.
- **Always remove all conflict markers.** If you leave `<<<<<<<` in your file, your code will break.
- **Run `git status` during a conflict.** It will remind you which files need to be resolved.
- **Test your code after resolving.** Make sure the merged version actually works.

---

## Deleting Merged Branches

After you have merged a branch, you do not need it anymore. Clean up by deleting it:

```bash
git branch -d add-about-page
git branch -d update-description
```

```
Deleted branch add-about-page (was f5e6d7c).
Deleted branch update-description (was a8b9c0d).
```

The `-d` flag is for "delete," and it only works if the branch has been fully merged. Git is protecting you from accidentally deleting unmerged work. Check your branches:

```bash
git branch
```

```
* main
```

Clean. Only `main` remains.

---

## A Practical Branching Workflow

Here is the workflow that professional developers follow every day:

1. **Start on `main`** and make sure it is up to date.
2. **Create a new branch** for whatever you are working on:
   ```bash
   git checkout -b feature/new-contact-form
   ```
3. **Do your work.** Edit files, make commits as you go.
4. **When you are done**, switch to `main` and merge:
   ```bash
   git checkout main
   git merge feature/new-contact-form
   ```
5. **Delete the branch** you just merged:
   ```bash
   git branch -d feature/new-contact-form
   ```
6. **Repeat** for your next task.

The rule is simple: **never work directly on `main`**. Always create a branch, do your work there, then merge it back. This keeps your `main` branch clean and stable. It should always be in a working state.

When you start working on teams, this becomes even more important. Your teammates are also branching off `main` for their own work. Branches keep everyone's changes separate until they are ready to be combined.

---

## Visualizing Branches

It can be helpful to visualize what branches look like. Here is a simple diagram:

```
main:     A --- B --- C ----------- G (merge commit)
                       \           /
feature:                D --- E --- F
```

- Commits A, B, C are on `main`.
- You created a branch at commit C and made commits D, E, F on `feature`.
- When you merge `feature` into `main`, Git creates commit G that brings everything together.

After the merge, `main` has all the commits: A, B, C, D, E, F, and G. The `feature` branch can be deleted. Its work lives on in `main`.

---

## Key Takeaways

1. A **branch** is a separate line of development, like a parallel universe where you can work without affecting the main project.
2. `git branch <name>` creates a new branch; `git checkout -b <name>` creates and switches to it in one step.
3. `git checkout <name>` (or `git switch <name>`) switches between branches, updating your files to match.
4. Commits on a branch only exist on that branch until you merge.
5. `git merge <branch>` combines a branch's changes into your current branch.
6. **Merge conflicts** happen when two branches edit the same lines. Resolve them by editing the file, removing conflict markers, and committing.
7. **Never work directly on `main`.** Always create a branch, do your work, then merge it back.

---

## Try It Yourself

Practice the complete branching workflow:

1. Navigate to your `git-practice` project (or create a new one with `git init` and a couple of commits).
2. Create a new branch called `feature/add-style` and switch to it.
3. Create or modify a CSS file. Add some styles you like. Stage and commit.
4. Switch back to `main`. Verify the CSS changes are not visible.
5. Merge `feature/add-style` into `main`. Verify the changes now appear.
6. Delete the `feature/add-style` branch.
7. Now practice a merge conflict:
   - On `main`, edit a line in `index.html`. Commit.
   - Create a new branch `feature/conflict-test` and switch to it.
   - Edit the **same line** in `index.html` with different text. Commit.
   - Switch back to `main` and try `git merge feature/conflict-test`.
   - Resolve the conflict markers in your editor, stage the file, and commit.
   - Run `git log --oneline` to see the merge commit.
   - Delete the `feature/conflict-test` branch.

If you can create a merge conflict and resolve it on your own, you are ahead of many developers who have been coding for years. Seriously, this is a skill that pays off every single week in a professional environment.
