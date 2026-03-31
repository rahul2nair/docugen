# Document Generator UX Wireframes & Design

## Core Goal
User should go from landing → generated document in under 30 seconds.

---

## Global Layout

----------------------------------------------------
| LOGO | Nav Items                 | CTA / Profile |
----------------------------------------------------

Main Content Area (max-width: 1100–1200px, centered)

----------------------------------------------------
| Footer (minimal)                                 |
----------------------------------------------------

---

## Landing Page (/)

Create documents instantly — no signup required

[ Start Creating ]   [ Browse Templates ]

### How it works
1. Choose Template
2. Fill Data
3. Download

### Feature Split
No login required:
- Use templates
- Live preview
- Download docs

With account:
- Bulk generation
- Save templates
- API access
- Email sending

---

## Create Page (/create)

What do you want to create?

[ Use Template ]
Create from ready-made templates

[ Create Custom ]
Write or paste your own document

[ Bulk Generate 🔒 ]
Generate 100s of documents using CSV

[ API Access 🔒 ]
Automate document generation

---

## Templates Page (/templates)

Search bar

Template Grid:
- Preview image
- Template name
- Use button

---

## Editor Screen

Left: Variables
Right: Live Preview

Example:

Name: [ John Doe ]
Salary: [ 100000 ]
Date: [ 01/01/2026 ]

[ Generate ]

---

## Generation Result

Your document is ready

[ Download PDF ]
[ Download Word ]
[ Share Link ]

Upgrade Prompt:
- Bulk generation
- Save templates
- Email sending

---

## Bulk Generation

Step 1: Upload CSV  
Step 2: Preview data  
Step 3: Generate  
Step 4: Download ZIP  

---

## Custom Template

Editor with placeholder detection:

Dear {{name}}, your salary is {{salary}}

Detected Variables:
- name
- salary

[ Generate ]
[ Save Template 🔒 ]

---

## My Files

List of generated documents:
- File name
- Download button

---

## API Page

- API Key
- Copy button
- Quick start info

---

## Settings

- API Key
- SMTP setup

---

## Locked Feature Modal

Feature Locked

- Upload CSV
- Download ZIP
- Save jobs

[ Create Free Account ]

---

## Final Flow

Landing → Create → Template/Custom/Bulk → Editor → Generate → Download

