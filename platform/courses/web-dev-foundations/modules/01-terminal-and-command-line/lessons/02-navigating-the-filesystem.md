---
title: "Navigating the Filesystem"
estimatedMinutes: 35
---

# Navigating the Filesystem

In the last lesson, you opened the terminal and ran your first command. Now it is time to learn how to move around. Right now, when you want to find a file on your computer, you open Finder (Mac), File Explorer (Windows), or Files (Linux) and click through folders. In this lesson, you are going to do the exact same thing, but faster, using the terminal.

By the end of this lesson, you will be able to answer three questions at any time: Where am I? What is here? How do I get somewhere else?

---

## The Filesystem Is a Tree

Before we start typing commands, let's build a mental picture of how your computer organizes files.

Think of your computer's filesystem like a big upside-down tree. At the very top is the **root**, the trunk, which contains everything. From the root, there are branches (folders), and those branches have smaller branches (subfolders), and at the tips of the branches are leaves (files).

Here is a simplified version of what this tree looks like:

```
/ (root - the very top)
├── Users/
│   └── sarah/  (your home folder)
│       ├── Desktop/
│       ├── Documents/
│       │   ├── resume.pdf
│       │   └── school/
│       │       └── notes.txt
│       ├── Downloads/
│       └── Pictures/
├── Applications/
└── System/
```

Another way to think about it: your filesystem is like a **filing cabinet**. The filing cabinet itself is the root (`/`). Inside it are drawers (`Users`, `Applications`, `System`). Inside the `Users` drawer, there are hanging folders for each user. Inside your folder, there are more folders for your Desktop, Documents, and so on.

When you use Finder or File Explorer, you are navigating this same tree by clicking. In the terminal, you navigate it by typing commands. Same tree, different way to move through it.

---

## `pwd`: Where Am I?

When you open the terminal, you start in a specific location in the filesystem. But where? Let's find out:

```bash
pwd
/Users/sarah
```

`pwd` stands for **print working directory**. A "directory" is just another word for "folder." Your "working directory" is the folder you are currently inside of.

When you run `pwd`, the terminal prints the full path to your current location. In the example above, you are inside the `sarah` folder, which is inside the `Users` folder, which is inside the root `/`.

Think of `pwd` as dropping a pin on a map. It tells you exactly where you are right now.

Try it:

```bash
pwd
```

Whatever path you see, that is your current location. On a Mac, it will probably be something like `/Users/yourname`. On Windows with Git Bash, it might look like `/c/Users/yourname`. On Linux, probably `/home/yourname`.

> **Tip:** Whenever you feel lost in the terminal, run `pwd`. It is your "You Are Here" sign.

---

## `ls`: What's Here?

Now that you know where you are, let's see what is in this folder:

```bash
ls
Desktop    Documents    Downloads    Music    Pictures    Videos
```

`ls` stands for **list**. It shows you the names of all the files and folders in your current directory. This is the equivalent of opening a folder in Finder and seeing its contents.

The output might look different on your computer. You might see more items or fewer. The colors might vary (some terminals show folders in blue and files in white). That is all normal.

### Listing a Specific Folder

You do not have to be inside a folder to see what is in it. You can pass a folder name as an argument:

```bash
ls Documents
resume.pdf    school    cover-letter.docx
```

This shows the contents of your `Documents` folder without you having to move into it first.

### `ls -l`: The Detail View

Add the `-l` flag (lowercase L, stands for "long") to see more information about each item:

```bash
ls -l
total 0
drwx------   4 sarah  staff  128 Mar 10 09:15 Desktop
drwx------   5 sarah  staff  160 Mar 12 14:30 Documents
drwx------   3 sarah  staff   96 Mar 14 08:00 Downloads
drwx------   3 sarah  staff   96 Jan 15 12:00 Music
drwx------   4 sarah  staff  128 Feb 20 16:45 Pictures
```

This looks like a lot at first. Here is what the key parts mean:

| Part | Meaning |
|------|---------|
| `d` at the start | This is a directory (folder). A `-` would mean it is a file. |
| `sarah` | The owner of the file/folder |
| `128` | The size (in bytes) |
| `Mar 10 09:15` | When it was last modified |
| `Desktop` | The name |

You do not need to memorize all of this right now. The main takeaway: `ls -l` shows you details, and the `d` at the beginning tells you if something is a folder or a file.

### `ls -a`: Showing Hidden Files

Some files are hidden. On Mac and Linux, any file or folder whose name starts with a dot (`.`) is hidden. These are usually configuration files that you do not need to see every day.

```bash
ls -a
.    ..    .bashrc    .config    Desktop    Documents    Downloads
```

Notice `.bashrc` and `.config`. Those are hidden files and folders you would not see with a plain `ls`.

Also notice `.` and `..`. These are special:

| Symbol | Meaning |
|--------|---------|
| `.` | The current directory (this folder) |
| `..` | The parent directory (one level up) |

You will use `..` constantly. More on that in a moment.

### `ls -la`: The Full Picture

Combine the flags to see all files (including hidden ones) with full details:

```bash
ls -la
```

This is the command experienced developers use most often. It shows everything with all the details. You will build a habit of using `ls -la` to get the full picture of any folder you are in.

---

## `cd`: Moving Between Folders

`cd` stands for **change directory**. This is how you move from one folder to another.

```bash
cd Documents
```

You will not see any output. The terminal just silently moves you into the `Documents` folder. But your prompt might change to reflect your new location:

```
sarah@macbook Documents $
```

Verify by running `pwd`:

```bash
pwd
/Users/sarah/Documents
```

And see what is inside:

```bash
ls
resume.pdf    school    cover-letter.docx
```

You are now inside `Documents`, just like double-clicking a folder in Finder.

### `cd ..`: Going Up One Level

To go back up to the parent folder (the folder that contains the one you are in), use `cd ..`:

```bash
cd ..
pwd
/Users/sarah
```

The `..` always means "one level up." You can chain them to go up multiple levels:

```bash
cd ../..
```

That takes you up two levels.

### `cd ~`: Going Home

No matter where you are in the filesystem, you can always jump straight back to your home folder:

```bash
cd ~
pwd
/Users/sarah
```

The tilde `~` is a shortcut that always means "my home directory." You can also just type `cd` with nothing after it. On most systems, this also takes you home:

```bash
cd
pwd
/Users/sarah
```

Think of `cd ~` as the "Home" button on a website. No matter how deep you have wandered, it brings you right back.

### `cd /`: Going to the Root

The root directory is the very top of the filesystem tree. To go there:

```bash
cd /
pwd
/
ls
Applications    Library    System    Users    bin    etc    usr    var
```

You are now at the trunk of the tree. Everything on your computer lives somewhere under `/`. You usually will not need to be here, but it is good to know it exists.

Go back home:

```bash
cd ~
```

---

## Absolute Paths vs. Relative Paths

This is one of the most important concepts in this lesson. There are two ways to describe a location in the filesystem:

### Absolute Paths: Directions from the Front Door

An **absolute path** starts from the root (`/`) and spells out every folder along the way. It works no matter where you currently are.

```bash
cd /Users/sarah/Documents/school
```

This is like giving someone directions from the front door of a building: "Enter the building, go to the second floor, turn left, third door on the right." It does not matter where the person currently is. These directions always work.

Absolute paths always start with `/`.

### Relative Paths: Directions from Where You Are

A **relative path** describes how to get somewhere starting from your current location.

```bash
cd Documents/school
```

This is like telling someone sitting next to you: "Go down the hall and turn left." It only makes sense from where you are right now.

Relative paths do NOT start with `/`. They start with a folder name, `..`, or `.`.

### Examples to Make It Click

Let's say you are in `/Users/sarah` and you want to get to `/Users/sarah/Documents/school`. You have two options:

**Absolute path (always works):**
```bash
cd /Users/sarah/Documents/school
```

**Relative path (works because you are in /Users/sarah):**
```bash
cd Documents/school
```

Both take you to the same place. The absolute path is longer but always works. The relative path is shorter but depends on where you are.

Now let's say you are in `/Users/sarah/Documents/school` and you want to get to `/Users/sarah/Pictures`:

**Absolute path:**
```bash
cd /Users/sarah/Pictures
```

**Relative path:**
```bash
cd ../../Pictures
```

The relative path says: go up one level (to `Documents`), go up another level (to `sarah`), then go into `Pictures`.

> **When to use which?** For short trips to nearby folders, relative paths are faster. For jumping across the filesystem to a specific known location, absolute paths are clearer. You will develop a feel for this with practice.

---

## The Home Directory

Your **home directory** is your personal space on the computer. It is where your Desktop, Documents, Downloads, and other personal folders live.

| Operating System | Home Directory Path |
|-----------------|-------------------|
| macOS | `/Users/yourname` |
| Linux | `/home/yourname` |
| Windows (Git Bash) | `/c/Users/yourname` |

The `~` shortcut always expands to your home directory. So these two commands do the same thing:

```bash
cd /Users/sarah
cd ~
```

You can also use `~` as part of a longer path:

```bash
cd ~/Documents/school
```

This means "start at my home folder, then go into Documents, then into school." This is a very common pattern.

---

## Path Separators

On macOS and Linux, the forward slash `/` separates folders in a path:

```
/Users/sarah/Documents/resume.pdf
```

On Windows, the traditional separator is a backslash `\`:

```
C:\Users\sarah\Documents\resume.pdf
```

But if you are using **Git Bash** on Windows (which we recommended), the forward slash `/` works just fine:

```
/c/Users/sarah/Documents/resume.pdf
```

Throughout this course, we will use forward slashes. If you are on Windows with Git Bash, everything will work as written.

---

## Putting It All Together

Let's walk through a realistic scenario. You are going to navigate around your actual filesystem. Follow along in your terminal:

**Step 1: Start from home**
```bash
cd ~
pwd
/Users/sarah
```

**Step 2: See what is here**
```bash
ls
Desktop    Documents    Downloads    Music    Pictures
```

**Step 3: Go into Documents**
```bash
cd Documents
pwd
/Users/sarah/Documents
ls
```

(You will see whatever is actually in your Documents folder.)

**Step 4: Go back home**
```bash
cd ~
pwd
/Users/sarah
```

**Step 5: Go into Desktop**
```bash
cd Desktop
pwd
/Users/sarah/Desktop
```

**Step 6: Go up one level**
```bash
cd ..
pwd
/Users/sarah
```

**Step 7: Jump to the root and look around**
```bash
cd /
ls
```

**Step 8: Go back home**
```bash
cd ~
```

If you followed along with those steps, you just navigated your entire filesystem using only the terminal. The folders are the same ones you see in Finder or File Explorer. You are just accessing them a different way.

---

## Key Takeaways

1. **Your filesystem is an upside-down tree.** The root (`/`) is at the top, and everything branches down from there.
2. **`pwd` tells you where you are.** It shows your current location in the filesystem. Use it whenever you feel lost.
3. **`ls` shows what is in a folder.** Add `-l` for details, `-a` for hidden files, or `-la` for both.
4. **`cd` moves you between folders.** Give it a folder name to go in, `..` to go up, and `~` to go home.
5. **Absolute paths start from root (`/`)** and always work. **Relative paths start from where you are** and are shorter but context-dependent.
6. **The home directory (`~`) is your personal space.** Your Desktop, Documents, and Downloads live here.
7. **`.` means the current folder, `..` means the parent folder.** You will use `..` constantly to move up levels.

---

## Try It Yourself

Open your terminal and complete these exercises. Use `pwd` after each step to verify your location.

1. **Find your home.** Run `cd ~` then `pwd`. Write down your home directory path.

2. **Explore your folders.** Use `ls` to see what folders are in your home directory. Then use `cd` to go into three different folders (one at a time), running `ls` inside each one to see what is there. Use `cd ..` to go back up each time.

3. **Hidden files hunt.** Go to your home directory and run `ls -a`. How many hidden files or folders do you see (items that start with a dot)? You do not need to know what they do. Just count them.

4. **Absolute vs. relative.** Navigate to your Documents folder using a relative path (`cd Documents`). Go back home (`cd ~`). Now navigate to the same folder using the absolute path (like `cd /Users/yourname/Documents`). Use `pwd` to confirm you ended up in the same place both times.

5. **The deep dive.** From your home directory, navigate as deep as you can into your folder structure using `cd`. For example, `cd Documents`, then `cd` into a subfolder, and so on. Run `pwd` to see how deep you went. Then use a single `cd ~` to jump all the way back home.

6. **Visit the root.** Run `cd /` to go to the root. Run `ls` to see what is there. Then go back home with `cd ~`. How many folders are at the root level?

In the next lesson, you will learn how to create your own files and folders from the terminal. You have been exploring. Now you are going to start building.
