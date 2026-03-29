---
title: "What Is Version Control?"
estimatedMinutes: 30
---

# What Is Version Control?

You have written code. You have navigated your filesystem with the terminal. You have created files and folders. But here is a question that every developer faces sooner or later: **what happens when you make a mistake and want to go back?**

In this lesson, you will learn about version control, one of the most important tools in a developer's toolkit. By the end, you will have Git installed, configured, and ready to use. This is the foundation for everything else in this module.

---

## The Problem: One File, One Save

Think about writing an important essay, a college application, a cover letter, something that really matters. You start writing. You save it. You make some edits. You save again. You make more edits. You save again.

Now imagine you realize that the version you had *two hours ago* was actually better. But you saved over it. It is gone.

Sound familiar? Most of us have dealt with this by creating files like:

```
resume.docx
resume_v2.docx
resume_FINAL.docx
resume_FINAL_v2.docx
resume_FINAL_ACTUALLY_FINAL.docx
resume_FINAL_ACTUALLY_FINAL_march14.docx
```

This is chaos. You have six files, you are not sure which one is the "real" one, and if you are working with someone else on the same document, things get even messier. Who changed what? When did they change it? Did they overwrite your work?

This is the exact problem that **version control** solves.

---

## What Is Version Control?

Version control is a system that **records changes to files over time** so you can recall specific versions later. Think of it as a time machine for your work.

Every time you save a snapshot (called a **commit** in Git), version control remembers:

- **What** changed (which lines were added, removed, or modified)
- **When** it changed (a timestamp)
- **Who** changed it (your name and email)
- **Why** it changed (a message you write explaining the change)

Instead of keeping dozens of copies of the same file, you keep **one file** and a **complete history** of every change ever made to it. You can jump back to any point in that history whenever you want.

Here is what that looks like in practice. Instead of this mess:

```
my-website/
├── index_old.html
├── index_backup.html
├── index_v2.html
├── index_FINAL.html
└── index.html          ← which one is current??
```

You have this:

```
my-website/
└── index.html          ← always the current version
    (Git remembers every previous version internally)
```

Clean. Simple. Powerful.

---

## What Is Git?

**Git** is the most popular version control system in the world. It was created in 2005 by Linus Torvalds (the same person who created Linux, the operating system that runs most of the internet's servers).

Git is:

- **Free and open source.** Anyone can use it, no cost
- **Fast.** It works on your local computer, so operations happen in milliseconds
- **Distributed.** Every developer has a complete copy of the project history
- **The industry standard.** Virtually every software company uses Git

When someone says "version control" in 2026, they almost always mean Git. There are other version control systems out there, but Git has won. Learning Git is not optional if you want to work in tech. It is a requirement.

---

## Git vs. GitHub: They Are Not the Same Thing

This is one of the most common points of confusion for beginners, so let us clear it up right now.

**Git** is a tool that runs on your computer. It tracks changes to your files. You use it from the terminal (remember the terminal from Module 01. You will be using those skills here).

**GitHub** is a website (github.com) that hosts Git repositories online. It lets you back up your code to the internet, share it with others, and collaborate with teammates.

Here is an analogy: think about the difference between a **word processor** (like Microsoft Word or Google Docs) and **Google Drive** (the cloud storage). The word processor is the tool you use to write and edit documents. Google Drive is where you store them online so other people can access them.

- **Git** = the word processor (the tool that does the work)
- **GitHub** = Google Drive (the online platform that stores and shares your work)

You can use Git without GitHub. You can track changes to files on your own computer and never put them online. But in practice, almost every developer uses both. Git for tracking changes locally, and GitHub for backing up and sharing their code.

We will cover GitHub in detail in Lesson 4. For now, let us focus on Git itself.

---

## Installing Git

Before we can use Git, we need to install it. Open your terminal (you learned how to do this in Module 01) and check if Git is already installed:

```bash
git --version
```

If Git is installed, you will see something like:

```
git version 2.44.0
```

If you see a version number, you are good to go. Skip to the next section. If you get an error like "command not found," follow the instructions below for your operating system.

### macOS

The easiest way to install Git on a Mac is with Homebrew (a package manager). If you have Homebrew installed:

```bash
brew install git
```

If you do not have Homebrew, you can install Git by running `git --version` in your terminal. macOS will prompt you to install the Xcode Command Line Tools, which includes Git. Follow the prompts and you will be set.

### Windows

Download the installer from [git-scm.com](https://git-scm.com/download/win). Run the installer and accept the default settings. When it is done, open **Git Bash** (a terminal that was installed with Git) and verify:

```bash
git --version
```

### Linux

Use your distribution's package manager:

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install git

# Fedora
sudo dnf install git
```

After installation, verify it worked:

```bash
git --version
```

You should see a version number. If you do, Git is installed and ready.

---

## Configuring Git for the First Time

Before you start using Git, you need to tell it who you are. This information gets attached to every change you make, so your team knows who did what.

Run these two commands in your terminal, replacing the placeholder text with your actual name and email:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

For example:

```bash
git config --global user.name "Jasmine Williams"
git config --global user.email "jasmine.williams@email.com"
```

The `--global` flag means this setting applies to every Git project on your computer. You only need to do this once.

There is one more setting we should configure. By default, Git names the first branch "master" in new projects. The industry has largely moved to using "main" instead. Let us set that:

```bash
git config --global init.defaultBranch main
```

You can verify all your settings with:

```bash
git config --list
```

You should see your name, email, and default branch in the output:

```
user.name=Jasmine Williams
user.email=jasmine.williams@email.com
init.defaultBranch=main
```

---

## The Mental Model: Three Stages of Git

Before we start using Git commands (that is next lesson), it is important to understand the mental model of how Git works. Git has **three stages** that your files move through:

1. **Working Directory.** This is just your project folder. The files you see in your file explorer or when you run `ls` in the terminal. When you edit a file, you are changing it in the working directory.

2. **Staging Area.** This is a holding zone. When you are happy with a change, you move it to the staging area. Think of this as putting items on a conveyor belt. They are ready to go, but have not been shipped yet.

3. **Repository.** This is the permanent record. When you "commit" your staged changes, Git takes a snapshot and stores it in the repository. This snapshot is saved forever (or until you explicitly delete it).

Here is an analogy that ties it all together. Imagine you are **writing a letter and mailing it**:

- **Working Directory** = writing the letter at your desk. You can scribble, erase, rewrite. No one sees this but you.
- **Staging Area** = putting the finished letter in an envelope and sealing it. You have decided this is what you want to send.
- **Repository** = dropping the envelope in the mailbox. It is sent. It is on the record. You have a copy of what you sent and when.

The flow always goes in one direction:

```
Working Directory  →  Staging Area  →  Repository
   (edit files)      (prepare changes)  (save snapshot)
```

In the next lesson, you will learn the actual Git commands that move your files through these three stages. But understanding this mental model first is critical. It is the framework that makes every Git command make sense.

---

## Why This Matters for Your Career

Version control is not just a nice-to-have skill. It is foundational to how professional software teams work. Here is why:

- **Every job posting expects it.** If you apply for any developer role (front-end, back-end, mobile, data), Git will be listed as a requirement or assumed knowledge.
- **It protects your work.** You will never lose code again. Made a mistake? Go back to a previous version. It is that simple.
- **It enables collaboration.** When you work on a team, Git lets multiple people work on the same project without overwriting each other's changes.
- **Your GitHub profile is your portfolio.** Hiring managers and recruiters look at your GitHub to see what you have built. We will talk more about this in Lesson 4.

You are building a skill right now that will serve you for your entire career in tech. Let us keep going.

---

## Key Takeaways

1. **Version control** records changes to files over time, letting you go back to any previous version.
2. **Git** is the most popular version control system and the industry standard. Learning it is essential.
3. **Git and GitHub are different things.** Git is a tool on your computer; GitHub is a website that hosts your code online.
4. You configure Git once with `git config --global user.name` and `git config --global user.email`.
5. Set your default branch name to "main" with `git config --global init.defaultBranch main`.
6. Git has **three stages**: Working Directory (edit), Staging Area (prepare), and Repository (save).
7. Think of the three stages like writing a letter, sealing the envelope, and dropping it in the mailbox.

---

## Try It Yourself

Complete these steps in your terminal to get Git installed and configured:

1. Open your terminal.
2. Check if Git is installed by running `git --version`. If not, install it following the instructions above.
3. Configure your name: `git config --global user.name "Your Actual Name"`
4. Configure your email: `git config --global user.email "your@email.com"`
5. Set your default branch: `git config --global init.defaultBranch main`
6. Verify your configuration by running `git config --list` and confirming your name, email, and default branch appear.
7. **Bonus**: Run `git help` in your terminal. Scan the list of commands it shows. You do not need to understand them yet. Just notice how many there are. In the next lesson, you will learn the most important ones.

Once you see your name and email in the `git config --list` output, you are ready for the next lesson. Nice work. You have taken the first step into version control.
