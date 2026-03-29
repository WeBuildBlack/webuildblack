---
title: "Creating and Managing Files"
estimatedMinutes: 35
---

# Creating and Managing Files

You can navigate the filesystem like a pro. Now it is time to start building things. In this lesson, you are going to learn how to create folders and files, copy them, move them, rename them, delete them, and view their contents, all from the terminal.

Think of the previous lesson as learning to walk around a city. This lesson is learning to build houses, move furniture, and read the mail. By the end, you will be able to create an entire project structure with nothing but a few typed commands.

---

## `mkdir`: Creating Folders

`mkdir` stands for **make directory**. It creates a new folder.

```bash
mkdir my-project
```

That's it. You now have a new folder called `my-project` in your current directory. Verify it:

```bash
ls
Desktop    Documents    Downloads    my-project    Pictures
```

There it is. Let's go inside and see that it is empty:

```bash
cd my-project
ls
```

Nothing. It is a brand-new, empty folder. Like putting up the walls of a room but not putting anything inside yet.

### Creating Multiple Folders at Once

You can create several folders in one command by listing them:

```bash
mkdir css js images
ls
css    images    js
```

Three folders, one command. Fast.

### `mkdir -p`: Creating Nested Folders

What if you want to create a folder inside a folder that does not exist yet? Normally, `mkdir` would give you an error:

```bash
mkdir projects/website/css
mkdir: projects/website: No such file or directory
```

The terminal is saying: "I can't create `css` inside `website` inside `projects` because `projects` and `website` don't exist yet."

The `-p` flag (stands for "parents") tells `mkdir` to create all the folders in the path, even the ones that do not exist yet:

```bash
mkdir -p projects/website/css
```

Now the entire chain (`projects`, then `website` inside it, then `css` inside that) exists. Verify:

```bash
ls projects
website

ls projects/website
css
```

The `-p` flag is incredibly useful. You will use it all the time to set up project structures quickly.

---

## `touch`: Creating Empty Files

`touch` creates a new, empty file:

```bash
touch index.html
ls
index.html
```

You now have a file called `index.html`. It exists, but it is empty, like creating a blank piece of paper and writing a title on the tab.

You can create multiple files at once:

```bash
touch style.css app.js README.md
ls
app.js    index.html    README.md    style.css
```

Four files, one command.

> **Fun fact:** The `touch` command was originally designed to update the "last modified" timestamp on a file. Creating a new file is actually a side effect. If the file doesn't exist, `touch` creates it. But everyone uses it for creating files, so that's its practical purpose now.

### Combining `mkdir` and `touch`

Let's create a simple project structure step by step:

```bash
mkdir -p my-website/css my-website/js my-website/images
touch my-website/index.html
touch my-website/css/style.css
touch my-website/js/app.js
```

Now let's see the result:

```bash
ls my-website
css    images    index.html    js

ls my-website/css
style.css

ls my-website/js
app.js
```

You just created the scaffolding for a website project. No clicking, no right-click menus. Just a few typed commands. This is why developers love the terminal.

---

## `cp`: Copying Files and Folders

`cp` stands for **copy**. It makes a duplicate of a file.

```bash
cp style.css style-backup.css
ls
style-backup.css    style.css
```

The first argument is the file you want to copy (the source). The second argument is the name for the copy (the destination). Think of it like a photocopier: you put in the original and specify where the copy should go.

### Copying to a Different Folder

You can copy a file into a different folder:

```bash
cp index.html backup/index.html
```

Or copy it and keep the same name by specifying just the folder:

```bash
cp index.html backup/
```

### Copying Folders with `cp -r`

To copy an entire folder and everything inside it, you need the `-r` flag. The "r" stands for **recursive**, which means "this folder and everything inside it, all the way down."

```bash
cp -r my-website my-website-backup
ls
my-website    my-website-backup
```

Without `-r`, the terminal will refuse to copy a folder:

```bash
cp my-website my-website-backup
cp: my-website is a directory (not copied).
```

Remember: **`cp` for files, `cp -r` for folders**.

---

## `mv`: Moving and Renaming Files

`mv` stands for **move**. It does two things depending on how you use it.

### Moving a File to a Different Folder

```bash
mv report.txt Documents/
```

This moves `report.txt` into the `Documents` folder. The file is no longer in its original location. It has been relocated. This is like picking up a book off your desk and putting it on the shelf.

```bash
ls
Documents

ls Documents
report.txt
```

### Renaming a File

If you "move" a file to a new name in the same folder, it renames the file:

```bash
mv old-name.txt new-name.txt
ls
new-name.txt
```

The file `old-name.txt` no longer exists. It has been renamed to `new-name.txt`. The content inside is completely unchanged.

### Moving and Renaming at the Same Time

You can move a file to a different folder AND give it a new name in one command:

```bash
mv draft.txt Documents/final-report.txt
```

This moves `draft.txt` into `Documents` and renames it to `final-report.txt`.

### Moving Folders

`mv` works on folders too, and you do NOT need a `-r` flag (unlike `cp`):

```bash
mv my-project Documents/
```

This moves the entire `my-project` folder into `Documents`.

---

## `rm`: Deleting Files

`rm` stands for **remove**. It deletes files.

```bash
rm old-file.txt
```

The file is gone.

Now here is the most important warning in this entire module:

> **WARNING: `rm` is permanent. There is no trash can. There is no undo. There is no "Are you sure?" prompt. When you `rm` a file, it is gone forever.**

This is different from dragging a file to the Trash on your desktop, where you can still recover it. The terminal's `rm` command skips the trash entirely. The file is deleted immediately and permanently.

Because of this, always double-check your command before pressing Enter. Make sure you are deleting the right file.

### `rm -r`: Deleting Folders

Just like `cp`, you need the `-r` flag to delete a folder and everything inside it:

```bash
rm -r old-project
```

This deletes `old-project` and every file and subfolder it contains. Be especially careful with this one.

### What NOT to Do

You will sometimes see people mention the command `rm -rf /`. **Never run this command.** It attempts to delete everything on your entire computer starting from the root. Modern systems have safeguards against this, but it is still dangerous and there is no reason to ever type it.

The rule is simple: only `rm` things you specifically intend to delete, and always double-check the path.

### A Safer Approach

If you want to be extra careful, you can use the `-i` flag (interactive mode), which asks for confirmation before each deletion:

```bash
rm -i important-file.txt
remove important-file.txt? y
```

You type `y` for yes or `n` for no. This is a good habit when you are deleting things and want to be cautious.

---

## Viewing File Contents

You have created files. Now let's learn how to look inside them without opening a text editor. First, let's create a file with some content so we have something to look at:

```bash
echo "Hello from the terminal!" > greeting.txt
```

(We will explain the `>` in a moment. For now, just know this creates a file with text inside it.)

### `cat`: Print the Whole File

`cat` stands for **concatenate**, but in practice it is used to print the entire contents of a file to the screen:

```bash
cat greeting.txt
Hello from the terminal!
```

Quick, simple, and perfect for short files. For long files, `cat` will dump everything to the screen at once, which can be overwhelming. That is where the next commands come in.

### `less`: Page Through a Long File

`less` opens a file in a scrollable viewer:

```bash
less long-document.txt
```

When you are inside `less`:

| Key | Action |
|-----|--------|
| **Space** or **Page Down** | Scroll down one page |
| **b** or **Page Up** | Scroll up one page |
| **Up/Down Arrows** | Scroll one line at a time |
| **q** | Quit and return to the terminal |
| **/searchterm** | Search for text (press **n** for next match) |

The most important key: **q to quit**. If you ever open `less` and feel stuck, press `q`.

> **Note:** `more` is an older version of `less` that only scrolls forward. Use `less`. It does everything `more` does and more. (Yes, that means "less is more." Developers love this joke.)

### `head` and `tail`: Peek at the Beginning or End

`head` shows you the first 10 lines of a file:

```bash
head long-document.txt
```

`tail` shows you the last 10 lines:

```bash
tail long-document.txt
```

You can specify how many lines with the `-n` flag:

```bash
head -n 5 long-document.txt
tail -n 20 long-document.txt
```

These are useful for quickly checking what is at the top or bottom of a file without opening the whole thing.

---

## Redirecting Output: `>` and `>>`

Earlier, you used `echo` to print text to the screen. But you can also redirect that output into a file. This is where things get powerful.

### `>`: Write to a File (Overwrite)

The `>` symbol sends the output of a command into a file instead of printing it to the screen. If the file does not exist, it creates it. If it does exist, **it overwrites the entire file**.

```bash
echo "First line of my file" > notes.txt
cat notes.txt
First line of my file
```

If you run it again with different text:

```bash
echo "This replaces everything" > notes.txt
cat notes.txt
This replaces everything
```

The original content is gone. The `>` symbol overwrites.

### `>>`: Append to a File

The `>>` symbol adds text to the end of a file without erasing what is already there:

```bash
echo "Line 1" > notes.txt
echo "Line 2" >> notes.txt
echo "Line 3" >> notes.txt
cat notes.txt
Line 1
Line 2
Line 3
```

Think of `>` as replacing a whole page in a notebook, and `>>` as writing on the next blank line.

### Building a File Line by Line

You can use `echo` and `>>` to build up a file piece by piece:

```bash
echo "<!DOCTYPE html>" > index.html
echo "<html>" >> index.html
echo "<head><title>My Page</title></head>" >> index.html
echo "<body>" >> index.html
echo "<h1>Hello, World!</h1>" >> index.html
echo "</body>" >> index.html
echo "</html>" >> index.html
cat index.html
<!DOCTYPE html>
<html>
<head><title>My Page</title></head>
<body>
<h1>Hello, World!</h1>
</body>
</html>
```

You just wrote an HTML file entirely from the terminal. You are not expected to build files like this normally (you will use a text editor), but it is a great way to understand how output redirection works.

---

## Practice: Creating a Project Folder Structure

Let's put everything together. You are going to create the folder structure for a simple website project. Follow along step by step:

```bash
cd ~
mkdir -p portfolio/css portfolio/js portfolio/images
touch portfolio/index.html
touch portfolio/about.html
touch portfolio/css/style.css
touch portfolio/js/main.js
echo "/* Portfolio styles */" > portfolio/css/style.css
echo "// Portfolio JavaScript" > portfolio/js/main.js
```

Now verify your work:

```bash
ls portfolio
about.html    css    images    index.html    js

ls portfolio/css
style.css

cat portfolio/css/style.css
/* Portfolio styles */

cat portfolio/js/main.js
// Portfolio JavaScript
```

You built a complete project skeleton in under a minute. Think about how long that would have taken with right-clicking and creating folders one by one in Finder.

---

## Key Takeaways

1. **`mkdir` creates folders.** Use `mkdir -p` to create nested folders in one command.
2. **`touch` creates empty files.** You can create multiple files at once by listing them.
3. **`cp` copies files, `cp -r` copies folders.** The `-r` flag means "recursive" (everything inside too).
4. **`mv` moves and renames files.** Same command for both operations. Works on folders without needing `-r`.
5. **`rm` deletes permanently.** There is no trash can, no undo. Use `-r` for folders, and always double-check before pressing Enter.
6. **`cat` prints file contents, `less` lets you scroll, `head`/`tail` show the beginning/end.**
7. **`>` writes to a file (overwriting), `>>` appends to the end.** Use these with `echo` to create files with content.

---

## Try It Yourself

1. **Build a project.** Create the following folder structure using `mkdir -p` and `touch`:

   ```
   blog/
   ├── index.html
   ├── posts/
   │   ├── first-post.html
   │   └── second-post.html
   ├── css/
   │   └── blog-style.css
   └── images/
   ```

2. **Add content.** Use `echo` and `>` to write `<h1>My Blog</h1>` into `blog/index.html`. Use `cat` to verify it.

3. **Copy practice.** Copy `blog/posts/first-post.html` to `blog/posts/third-post.html`. Copy the entire `blog` folder to `blog-backup` using `cp -r`.

4. **Rename practice.** Rename `blog/css/blog-style.css` to `blog/css/style.css` using `mv`.

5. **Append practice.** Use `echo` and `>>` to add three lines of text to `blog/index.html`, one at a time. Use `cat` to see all the lines.

6. **Clean up.** Delete the `blog-backup` folder using `rm -r`. Use `ls` to confirm it is gone.

You now have the power to create, copy, move, rename, and delete anything on your computer from the terminal. In the next lesson, you will learn commands for searching, inspecting, and chaining operations together. These are the tools that will make you truly efficient.
