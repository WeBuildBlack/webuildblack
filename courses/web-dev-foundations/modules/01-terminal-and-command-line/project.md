---
title: "Module Project: Terminal Treasure Hunt"
estimatedMinutes: 60
---

# Module Project: Terminal Treasure Hunt

Welcome to your first module project. You are going to use every command you learned in this module (navigating, creating, viewing, searching, moving, and deleting) in a hands-on scavenger hunt.

This project simulates a real scenario: you have been asked to set up and organize the file system for a small company called **Gem Technologies**. You will build out the folder structure, populate it with files, search through them to find information, reorganize things, and clean up. Along the way, you will prove to yourself that you really do know the terminal.

Some steps tell you exactly what command to run. Others give you a challenge and let you figure out the command on your own. If you get stuck on a challenge step, try it for at least two minutes before looking at the hint.

Let's get started.

---

## Step 1: Set Up the Company File Structure

First, navigate to your home directory and create the project folder:

```bash
cd ~
mkdir treasure-hunt
cd treasure-hunt
```

Now create the full company folder structure. Run this command:

```bash
mkdir -p departments/engineering departments/design departments/marketing projects/website projects/mobile-app docs
```

Verify the structure:

```bash
ls
departments    docs    projects

ls departments
design    engineering    marketing

ls projects
mobile-app    website
```

You should see three top-level folders, three department folders, and two project folders. If your output matches, you are good.

---

## Step 2: Create the Team Files

Every department needs a team roster. Create files for each department:

```bash
echo "Engineering Team Roster" > departments/engineering/team.txt
echo "- Marcus: Backend Developer" >> departments/engineering/team.txt
echo "- Aisha: Frontend Developer" >> departments/engineering/team.txt
echo "- Devon: Full-Stack Developer" >> departments/engineering/team.txt
echo "- Kenji: DevOps Engineer" >> departments/engineering/team.txt
```

```bash
echo "Design Team Roster" > departments/design/team.txt
echo "- Zara: Lead Designer" >> departments/design/team.txt
echo "- Luis: UX Researcher" >> departments/design/team.txt
echo "- Priya: Visual Designer" >> departments/design/team.txt
```

```bash
echo "Marketing Team Roster" > departments/marketing/team.txt
echo "- Jasmine: Marketing Director" >> departments/marketing/team.txt
echo "- Tyler: Content Strategist" >> departments/marketing/team.txt
echo "- Nina: Social Media Manager" >> departments/marketing/team.txt
```

Verify one of them:

```bash
cat departments/engineering/team.txt
Engineering Team Roster
- Marcus: Backend Developer
- Aisha: Frontend Developer
- Devon: Full-Stack Developer
- Kenji: DevOps Engineer
```

---

## Step 3: Create the Project Files

Now populate the project folders. Run these commands:

```bash
echo "Project: Gem Technologies Website" > projects/website/README.txt
echo "Status: In Progress" >> projects/website/README.txt
echo "Lead: Aisha" >> projects/website/README.txt
echo "Stack: HTML, CSS, JavaScript" >> projects/website/README.txt
echo "Deadline: April 2026" >> projects/website/README.txt
echo "TODO: Finish homepage design" >> projects/website/README.txt
echo "TODO: Add contact form" >> projects/website/README.txt
echo "TODO: Optimize images" >> projects/website/README.txt
```

```bash
echo "Project: Gem Technologies Mobile App" > projects/mobile-app/README.txt
echo "Status: Planning" >> projects/mobile-app/README.txt
echo "Lead: Devon" >> projects/mobile-app/README.txt
echo "Stack: React Native" >> projects/mobile-app/README.txt
echo "Deadline: July 2026" >> projects/mobile-app/README.txt
echo "TODO: Create wireframes" >> projects/mobile-app/README.txt
echo "TODO: Set up development environment" >> projects/mobile-app/README.txt
```

Create some additional files in the website project:

```bash
mkdir -p projects/website/css projects/website/js projects/website/images
touch projects/website/index.html
touch projects/website/about.html
touch projects/website/contact.html
echo "/* Main stylesheet for Gem Technologies */" > projects/website/css/style.css
echo "// Main JavaScript file" > projects/website/js/app.js
```

---

## Step 4: Create Company Documentation

```bash
echo "Gem Technologies Company Handbook" > docs/handbook.txt
echo "=================================" >> docs/handbook.txt
echo "" >> docs/handbook.txt
echo "Founded: 2024" >> docs/handbook.txt
echo "Mission: Building technology that empowers communities" >> docs/handbook.txt
echo "Location: Brooklyn, NY" >> docs/handbook.txt
echo "" >> docs/handbook.txt
echo "Core Values:" >> docs/handbook.txt
echo "1. Community First" >> docs/handbook.txt
echo "2. Quality Over Speed" >> docs/handbook.txt
echo "3. Transparency" >> docs/handbook.txt
echo "4. Continuous Learning" >> docs/handbook.txt
```

```bash
echo "Onboarding Checklist" > docs/onboarding.txt
echo "====================" >> docs/onboarding.txt
echo "[ ] Get laptop set up" >> docs/onboarding.txt
echo "[ ] Install development tools" >> docs/onboarding.txt
echo "[ ] Join Slack workspace" >> docs/onboarding.txt
echo "[ ] Read company handbook" >> docs/onboarding.txt
echo "[ ] Meet your team" >> docs/onboarding.txt
echo "[ ] Set up terminal environment" >> docs/onboarding.txt
```

---

## Step 5: The Treasure Hunt Begins

Now that the company files are set up, it is time for the scavenger hunt. Use the commands you have learned to answer each question. Write your answers down.

### Question 1: Where are you?

Run the command that tells you your current directory. Confirm that you are inside the `treasure-hunt` folder.

**Command to use:** `pwd`

Expected output should end with `/treasure-hunt`.

### Question 2: How many people are on the Engineering team?

Use `cat` to view the engineering team file. Count the team members (not including the title line).

```bash
cat departments/engineering/team.txt
```

**Answer:** ______ people

### Question 3: Who is the lead on the website project?

Use `grep` to search for "Lead" in the website README:

```bash
grep "Lead" projects/website/README.txt
```

**Answer:** The lead is ______

### Question 4: How many TODO items are there across ALL projects?

**This is a challenge.** Use `grep` with the `-r` flag to search for "TODO" across the entire `projects` folder. Then count the results.

<details>
<summary>Hint (try it yourself first!)</summary>

```bash
grep -r "TODO" projects/
```

Count the lines in the output. For a bonus, pipe the result to `wc -l`:

```bash
grep -r "TODO" projects/ | wc -l
```

</details>

**Answer:** ______ TODO items

### Question 5: Find all `.html` files in the treasure hunt.

**This is a challenge.** Use the `find` command to locate every file ending in `.html` inside the `treasure-hunt` folder.

<details>
<summary>Hint (try it yourself first!)</summary>

```bash
find . -name "*.html"
```

</details>

**Answer:** List the files you found: ______

### Question 6: How many lines are in the company handbook?

**This is a challenge.** Use `wc` to count the lines in `docs/handbook.txt`.

<details>
<summary>Hint (try it yourself first!)</summary>

```bash
wc -l docs/handbook.txt
```

</details>

**Answer:** ______ lines

### Question 7: Which team member's name contains the letter "z" (case-insensitive)?

**This is a challenge.** Use `grep` with the right flags to search across all team files for a name containing "z", ignoring uppercase vs lowercase.

<details>
<summary>Hint (try it yourself first!)</summary>

```bash
grep -ri "z" departments/*/team.txt
```

</details>

**Answer:** ______

---

## Step 6: Reorganize the Company

The company has decided to reorganize. Follow these instructions to restructure the files.

### 6a: Create an archive folder

```bash
mkdir archive
```

### 6b: Move the mobile app project to the archive

The mobile app is on hold. Move the entire folder to the archive:

```bash
mv projects/mobile-app archive/
```

Verify:

```bash
ls projects
website

ls archive
mobile-app
```

### 6c: Rename the handbook

The handbook needs a more descriptive name. **This is a challenge.** Rename `docs/handbook.txt` to `docs/company-handbook-2026.txt`.

<details>
<summary>Hint</summary>

```bash
mv docs/handbook.txt docs/company-handbook-2026.txt
```

</details>

Verify:

```bash
ls docs
company-handbook-2026.txt    onboarding.txt
```

### 6d: Copy the onboarding checklist to each department

Every department should have a copy of the onboarding checklist. **This is a challenge.** Copy `docs/onboarding.txt` to each of the three department folders.

<details>
<summary>Hint</summary>

```bash
cp docs/onboarding.txt departments/engineering/
cp docs/onboarding.txt departments/design/
cp docs/onboarding.txt departments/marketing/
```

</details>

Verify one:

```bash
ls departments/engineering
onboarding.txt    team.txt
```

### 6e: Create a new "reports" folder with a Q1 report

```bash
mkdir docs/reports
echo "Q1 2026 Report" > docs/reports/q1-2026.txt
echo "Revenue: $150,000" >> docs/reports/q1-2026.txt
echo "New Clients: 12" >> docs/reports/q1-2026.txt
echo "Team Growth: 3 new hires" >> docs/reports/q1-2026.txt
```

---

## Step 7: Clean Up

The archive is being moved to cloud storage, so you can delete it from your local system.

**Be careful with this step.** Remember, `rm` is permanent.

First, verify what you are about to delete:

```bash
ls archive
mobile-app

ls archive/mobile-app
README.txt
```

Now delete the archive folder and everything inside it:

```bash
rm -r archive
```

Verify it is gone:

```bash
ls
departments    docs    projects
```

The `archive` folder is gone. Three top-level folders remain.

---

## Step 8: Verify Your Final Structure

Run this command to see your entire project structure:

```bash
find . -type f | sort
```

Your output should look like this:

```
./departments/design/onboarding.txt
./departments/design/team.txt
./departments/engineering/onboarding.txt
./departments/engineering/team.txt
./departments/marketing/onboarding.txt
./departments/marketing/team.txt
./docs/company-handbook-2026.txt
./docs/onboarding.txt
./docs/reports/q1-2026.txt
./projects/website/README.txt
./projects/website/about.html
./projects/website/contact.html
./projects/website/css/style.css
./projects/website/index.html
./projects/website/js/app.js
```

Count the files:

```bash
find . -type f | wc -l
```

You should have **15 files**. If your number matches and the file list looks correct, you completed the project successfully.

---

## Stretch Goals

If you finished the main project and want to push yourself further, try these optional challenges:

### Stretch 1: Write a Setup Script

Create a file called `setup.sh` that automates the folder creation from Step 1. The file should contain the `mkdir` and `touch` commands that build the initial structure:

```bash
echo '#!/bin/bash' > setup.sh
echo 'echo "Setting up Gem Technologies file structure..."' >> setup.sh
echo 'mkdir -p departments/engineering departments/design departments/marketing' >> setup.sh
echo 'mkdir -p projects/website projects/mobile-app' >> setup.sh
echo 'mkdir docs' >> setup.sh
echo 'echo "Done! Structure created."' >> setup.sh
```

Make it executable and run it:

```bash
chmod +x setup.sh
cd ~
mkdir test-setup
cd test-setup
~/treasure-hunt/setup.sh
Setting up Gem Technologies file structure...
Done! Structure created.
ls
departments    docs    projects
```

You just wrote your first shell script. It is a real program that automates a task. That is a big deal.

### Stretch 2: Create a Search Report

Use pipes to create a file that lists all TODO items across the project:

```bash
cd ~/treasure-hunt
grep -r "TODO" projects/ > docs/reports/todo-report.txt
cat docs/reports/todo-report.txt
```

### Stretch 3: Find and Count

Use pipes to answer: how many total team members are there across all three departments? (Hint: grep for lines starting with "- " in all team files, then count them.)

<details>
<summary>Solution</summary>

```bash
grep -r "^- " departments/*/team.txt | wc -l
```

Answer: 10 team members.

</details>

---

## Submission Checklist

Before you consider this project complete, confirm the following:

- [ ] The `treasure-hunt` folder exists in your home directory
- [ ] Three department folders exist, each with `team.txt` and `onboarding.txt`
- [ ] The `docs` folder contains `company-handbook-2026.txt`, `onboarding.txt`, and a `reports` subfolder
- [ ] The `projects/website` folder contains `README.txt`, three `.html` files, and `css`/`js`/`images` subfolders
- [ ] The `archive` folder has been deleted
- [ ] `find . -type f | wc -l` returns **15** (or more if you completed stretch goals)
- [ ] You can answer all 7 scavenger hunt questions from Step 5

---

## What You Just Accomplished

Take a moment to recognize what you did in this project:

- You created a complete folder structure from scratch using `mkdir`
- You populated files with content using `echo`, `>`, and `>>`
- You searched through files using `grep` and `find`
- You viewed file contents using `cat`
- You counted lines using `wc`
- You moved and renamed files using `mv`
- You copied files using `cp`
- You deleted files and folders using `rm`
- You piped commands together using `|`
- You verified your work using `ls`, `find`, and `pwd`

These are the same commands professional developers use every single day. You are not pretending to be a developer. You are doing what developers do. Carry that confidence into the next module.

You have completed Module 01: Terminal & Command Line. Next up: How the Web Works.
