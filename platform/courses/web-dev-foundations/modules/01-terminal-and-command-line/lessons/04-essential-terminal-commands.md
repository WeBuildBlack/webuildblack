---
title: "Essential Terminal Commands"
estimatedMinutes: 40
---

# Essential Terminal Commands

You can navigate your filesystem, create files and folders, and view their contents. In this lesson, you are going to level up with commands that let you search through files, chain operations together, check what tools you have installed, and work with keyboard shortcuts that save you real time every day.

Think of the previous lessons as learning to drive. This lesson is learning all the useful features: the mirrors, the cruise control, the GPS. These are the commands that turn you from someone who uses the terminal into someone who is efficient with it.

---

## `grep`: Searching Inside Files

`grep` lets you search for specific text inside files. Think of it as the Ctrl+F (or Command+F) you use in a web browser or document, but it can search across your entire computer.

The basic pattern is:

```bash
grep "search term" filename
```

Let's set up an example. Create a file to search through:

```bash
echo "The quick brown fox jumps over the lazy dog" > animals.txt
echo "The cat sat on the mat" >> animals.txt
echo "A fox and a rabbit went to the market" >> animals.txt
echo "Dogs are loyal companions" >> animals.txt
echo "The brown bear slept all winter" >> animals.txt
```

Now search for the word "fox":

```bash
grep "fox" animals.txt
The quick brown fox jumps over the lazy dog
A fox and a rabbit went to the market
```

`grep` found every line that contains "fox" and printed those lines. The lines that do not contain "fox" are skipped.

### Searching for "brown":

```bash
grep "brown" animals.txt
The quick brown fox jumps over the lazy dog
The brown bear slept all winter
```

### Case-Insensitive Search

By default, `grep` is case-sensitive. "Dog" and "dog" are different. Use the `-i` flag to ignore case:

```bash
grep -i "dog" animals.txt
The quick brown fox jumps over the lazy dog
Dogs are loyal companions
```

Without `-i`, only the first line would match (because "Dogs" starts with a capital D).

### Searching Multiple Files

You can search across many files at once. The `*` wildcard means "all files":

```bash
grep "TODO" *.js
app.js:// TODO: add error handling
utils.js:// TODO: refactor this function
```

`grep` shows you the filename and the matching line from each file. This is incredibly useful when you are working on a project and need to find where something is mentioned.

### Searching Folders Recursively

To search through a folder and all its subfolders, use `-r` (recursive):

```bash
grep -r "hello" my-project/
my-project/index.html:<h1>hello world</h1>
my-project/js/app.js:console.log("hello");
```

This searches every file in `my-project` and all its subdirectories.

---

## `find`: Finding Files by Name

While `grep` searches inside files, `find` searches for files and folders by their name or other properties.

The basic pattern is:

```bash
find where-to-look -name "what-to-find"
```

### Find a file by name:

```bash
find . -name "index.html"
./my-project/index.html
./portfolio/index.html
```

The `.` means "start searching from the current directory." The command found every file named `index.html` in any subfolder.

### Find all files with a specific extension:

```bash
find . -name "*.css"
./my-project/css/style.css
./portfolio/css/style.css
```

The `*` wildcard matches anything, so `*.css` means "any file ending in .css".

### Find only directories:

```bash
find . -type d -name "css"
./my-project/css
./portfolio/css
```

The `-type d` flag says "only find directories," not files.

### Find only files:

```bash
find . -type f -name "*.js"
./my-project/js/app.js
./portfolio/js/main.js
```

The `-type f` flag says "only find files."

`find` is your search engine for the filesystem. When you know a file exists but cannot remember where you put it, `find` will track it down.

---

## `which`: Finding Where a Program Is Installed

`which` tells you where a command or program lives on your computer:

```bash
which ls
/bin/ls

which grep
/usr/bin/grep
```

This is most useful when you want to check if a tool is installed:

```bash
which node
/usr/local/bin/node

which python3
/usr/bin/python3
```

If a program is not installed, `which` will either show nothing or print an error:

```bash
which nonexistent-program
```

(No output, or an error message. Either way, it means the program is not installed.)

---

## `man`: Reading the Manual

Almost every terminal command has a built-in manual. To read it, use `man`:

```bash
man ls
```

This opens the manual page for `ls`. You will see a detailed description of the command, all of its options, and examples.

Manual pages are viewed with the same controls as `less`:

| Key | Action |
|-----|--------|
| **Space** | Scroll down one page |
| **b** | Scroll up one page |
| **q** | Quit and return to the terminal |
| **/searchterm** | Search within the manual |

**Press `q` to exit the manual.** This is the most important thing to remember. If you open a `man` page and feel stuck, press `q`.

> **Tip:** Manual pages can be dense and technical. Do not expect to understand everything on the first read. Focus on the description at the top and the most common options. As you gain experience, you will get more out of manual pages.

If `man` is too much, many commands also support a `--help` flag that gives a shorter summary:

```bash
ls --help
```

(On macOS, some commands use `-h` instead of `--help`. Try both.)

---

## `history`: Seeing Your Command History

Your terminal remembers every command you have typed. To see the list:

```bash
history
  1  echo "Hello, World!"
  2  pwd
  3  ls
  4  cd Documents
  5  ls -la
  6  cd ~
  7  mkdir my-project
  ...
```

Each command has a number. You can re-run any previous command by typing `!` followed by the number:

```bash
!7
mkdir my-project
```

Or search your history by pressing **Ctrl + R** and typing a search term. This is called **reverse search** and it is one of the most useful tricks:

1. Press **Ctrl + R**
2. Start typing part of a command you remember (e.g., "grep")
3. The terminal shows the most recent command matching your search
4. Press **Enter** to run it, or **Ctrl + R** again to find an older match
5. Press **Ctrl + C** or **Esc** to cancel

Reverse search saves an enormous amount of time. Get in the habit of using it.

---

## Piping: `|` (Chaining Commands Together)

This is one of the most powerful ideas in the terminal. The **pipe** symbol (`|`, the vertical bar key, usually Shift + backslash on your keyboard) connects two commands. It takes the output of the first command and feeds it as input into the second command.

Think of it like an assembly line in a factory. The first station produces something, passes it down the conveyor belt, and the next station does something with it.

### Example: List Files and Search the List

```bash
ls -la | grep "css"
drwxr-xr-x  3 sarah  staff  96 Mar 14 10:00 css
```

Here is what happened:

1. `ls -la` listed all files with details
2. `|` sent that list to `grep`
3. `grep "css"` filtered the list to show only lines containing "css"

### Example: Count the Files in a Folder

```bash
ls | wc -l
12
```

1. `ls` listed the files
2. `|` sent that list to `wc`
3. `wc -l` counted the number of lines (which equals the number of items)

`wc` stands for **word count**. The `-l` flag tells it to count lines instead of words.

### Example: Sort a File and Show the Top 5

```bash
sort names.txt | head -n 5
Alice
Bob
Carlos
Diana
Eve
```

1. `sort names.txt` sorted the lines alphabetically
2. `|` passed the sorted list to `head`
3. `head -n 5` showed only the first 5 lines

### Chaining Multiple Pipes

You can chain as many pipes as you need:

```bash
cat long-file.txt | grep "error" | sort | head -n 10
```

This reads a file, filters for lines containing "error", sorts them alphabetically, and shows the first 10. Four operations, one command, one line.

---

## `wc`: Counting Words and Lines

`wc` (word count) gives you counts for a file:

```bash
wc animals.txt
  5  27 150 animals.txt
```

The three numbers are:

| Number | Meaning |
|--------|---------|
| 5 | Lines |
| 27 | Words |
| 150 | Characters (bytes) |

Use flags to get just one count:

```bash
wc -l animals.txt    # just lines
5 animals.txt

wc -w animals.txt    # just words
27 animals.txt
```

---

## `sort`: Sorting Output

`sort` arranges lines in alphabetical order:

```bash
echo "banana" > fruits.txt
echo "apple" >> fruits.txt
echo "cherry" >> fruits.txt
echo "date" >> fruits.txt

sort fruits.txt
apple
banana
cherry
date
```

Use `-r` for reverse (Z to A):

```bash
sort -r fruits.txt
date
cherry
banana
apple
```

---

## `chmod`: File Permissions (Brief, Practical)

Every file on your computer has permissions that control who can read it, write to it, and execute it (run it as a program). Most of the time, you will not need to think about permissions. But there is one situation that comes up often: making a script executable.

If you write a script and try to run it, you might see:

```bash
./my-script.sh
bash: ./my-script.sh: Permission denied
```

The fix:

```bash
chmod +x my-script.sh
./my-script.sh
```

`chmod +x` means "add execute permission." Now the file can be run as a program.

You do not need to memorize the full permissions system right now. Just remember: if you get "Permission denied" when trying to run a script, `chmod +x` is likely the fix.

---

## Environment Variables

Your terminal has a set of **environment variables**, named values that store configuration information. They are like settings that your terminal and the programs you run can read.

### Viewing an Environment Variable

Use `echo` with a `$` before the variable name:

```bash
echo $HOME
/Users/sarah

echo $USER
sarah
```

The most important environment variable for developers is `$PATH`:

```bash
echo $PATH
/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin
```

`$PATH` is a list of folders (separated by colons) where the terminal looks for programs. When you type `ls`, the terminal searches through each folder in `$PATH` until it finds the `ls` program. This is why `which ls` returns `/bin/ls`. The `ls` program lives in `/bin`, which is in your `$PATH`.

### Setting an Environment Variable

```bash
export MY_NAME="Sarah"
echo $MY_NAME
Sarah
```

The `export` command creates or updates an environment variable. This variable lasts for the current terminal session. When you close the terminal, it disappears.

You will use environment variables much more when you start building real applications (for things like API keys and configuration). For now, just understand what they are and how to view them.

---

## Installing Tools: Package Managers

A **package manager** is a tool that installs, updates, and manages other tools on your computer. Think of it like an app store for the terminal.

### macOS: Homebrew

Homebrew is the most popular package manager for Mac. To check if you have it:

```bash
which brew
/usr/local/bin/brew
```

If it is not installed, you can install it from [brew.sh](https://brew.sh). Once you have it:

```bash
brew install node    # installs Node.js
brew install git     # installs Git
```

### Linux: apt (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install nodejs
```

### Windows: Chocolatey

If you are on Windows and not using Git Bash, Chocolatey is a popular package manager. See [chocolatey.org](https://chocolatey.org) for setup instructions.

You do not need to install anything right now. This is a preview of how you will install development tools in future lessons.

---

## Checking Installed Tools

As a developer, you will frequently need to check whether a tool is installed and what version you have:

```bash
node --version
v20.11.0

npm --version
10.2.4

git --version
git version 2.43.0
```

The `--version` flag (sometimes `-v`) works with almost every tool. If the command prints a version number, the tool is installed. If you get "command not found," it is not installed yet.

---

## Opening VS Code from the Terminal

If you have Visual Studio Code installed, you can open it directly from the terminal:

```bash
code .
```

The `.` means "open the current directory." VS Code will launch with your current folder loaded in the file explorer. This is one of the most common commands developers use. Navigate to a project folder in the terminal, then type `code .` to start working.

> **Setup required (macOS):** The first time you use this, you may need to set it up. Open VS Code, press **Command + Shift + P**, type "shell command," and select **"Shell Command: Install 'code' command in PATH."** After that, `code .` will work from any terminal.

You can also open a specific file:

```bash
code index.html
```

Or a specific folder:

```bash
code ~/projects/my-website
```

---

## Keyboard Shortcuts That Save Your Life

These shortcuts work in most terminals and will make you dramatically faster. Start practicing them now and they will become second nature.

| Shortcut | Action |
|----------|--------|
| **Ctrl + C** | Cancel the current command. If something is running and you want to stop it, this is your escape hatch. |
| **Ctrl + L** | Clear the screen (same as typing `clear`). |
| **Ctrl + A** | Jump to the beginning of the current line. |
| **Ctrl + E** | Jump to the end of the current line. |
| **Ctrl + W** | Delete the word before the cursor. |
| **Ctrl + U** | Delete everything before the cursor on the current line. |
| **Ctrl + K** | Delete everything after the cursor on the current line. |
| **Ctrl + R** | Reverse search through command history. |
| **Tab** | Auto-complete file and folder names. |
| **Up/Down Arrows** | Cycle through previous commands. |

The most critical ones:

- **Ctrl + C**: Your emergency stop button. Memorize this first. If the terminal seems frozen or something is running that you did not expect, press Ctrl + C.
- **Ctrl + A and Ctrl + E**: Jump to the start and end of a line. Incredibly useful when editing long commands.
- **Ctrl + R**: Search your history. Instead of pressing Up Arrow 50 times, search for what you need.

### Practice These Now

1. Type a long command like `echo "this is a really long command that I am typing"` but do NOT press Enter
2. Press **Ctrl + A**: your cursor jumps to the beginning
3. Press **Ctrl + E**: your cursor jumps to the end
4. Press **Ctrl + U**: the entire line is deleted
5. Type `echo "testing Ctrl+C"` and press Enter. It prints the text
6. Type `cat` by itself and press Enter. The terminal waits for input
7. Press **Ctrl + C**: you are back to the prompt

These are muscle memory skills. The more you practice them, the faster you become.

---

## Putting It All Together: A Real Workflow

Let's simulate a realistic developer workflow using the commands from this lesson:

```bash
cd ~/projects/my-website
ls
css    images    index.html    js

grep "TODO" *.html
index.html:<!-- TODO: add navigation -->
index.html:<!-- TODO: add footer -->

find . -name "*.css"
./css/style.css

cat css/style.css | wc -l
47

history | grep "mkdir"
  23  mkdir my-website
  24  mkdir -p my-website/css my-website/js

code .
```

In this workflow, you navigated to a project, checked what files exist, searched for TODO comments, found all CSS files, counted lines in a stylesheet, looked through your history, and opened the project in VS Code. All in about ten seconds.

This is what the terminal gives you. These individual commands are simple, but combined, they make you incredibly efficient.

---

## Key Takeaways

1. **`grep` searches inside files.** Use `-i` for case-insensitive and `-r` for recursive (searching subfolders).
2. **`find` searches for files by name.** Use `-name "*.ext"` to find files by extension and `-type d` or `-type f` to limit to directories or files.
3. **`man` opens the manual for any command.** Press `q` to quit. Use `--help` for a shorter summary.
4. **The pipe `|` chains commands together.** The output of one command becomes the input of the next, like an assembly line.
5. **`$PATH` tells the terminal where to find programs.** `which` shows you where a specific program lives.
6. **Ctrl + C cancels, Ctrl + R searches history, Ctrl + A/E jumps to start/end of a line.** Practice these until they are automatic.
7. **`code .` opens VS Code in the current folder.** This is how most developers start their work sessions.

---

## Try It Yourself

1. **Grep practice.** Create a file called `quotes.txt` with at least 5 lines of text (use `echo` and `>>`). Use `grep` to find lines containing a specific word. Try it with `-i` to ignore case.

2. **Find practice.** Navigate to your home directory and use `find` to locate all files ending in `.txt`. Then use `find` to locate all directories named "Documents."

3. **Pipe challenge.** Create a file with 10 names (one per line). Use `sort` to sort them, then pipe the result to `head -n 5` to show only the first 5 sorted names. Try: `sort names.txt | head -n 5`.

4. **Word count.** Use `wc -l` on a few files to count their lines. Try piping `ls` into `wc -l` to count how many items are in a folder.

5. **History dive.** Run `history` and count how many commands you have run so far in this course. Use `history | grep "cd"` to find all the times you changed directories.

6. **Keyboard shortcut drill.** Type a long command (do not press Enter). Practice jumping to the start (Ctrl + A), the end (Ctrl + E), and deleting the line (Ctrl + U). Do this five times until it feels natural.

7. **Check your tools.** Run `node --version`, `npm --version`, and `git --version`. If any of these are not installed, that is okay. You will install them in a later module. Just note which ones you have.

You have now learned the essential terminal commands that professional developers use every day. In the module project, you are going to put all of these skills together in a hands-on Terminal Treasure Hunt. Let's go.
