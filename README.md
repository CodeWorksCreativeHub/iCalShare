# iCalShare 📅

iCalShare is a lightweight, static web application for discovering, previewing, and sharing `.ics` calendar feeds. It features automated calendar submissions powered by GitHub Actions, enabling zero-backend event management and directory updates.

---

## 🚀 Features

- **Interactive Calendar Directory:** Search and filter curated `.ics` calendars by category or search terms.
- **In-Browser `.ics` Parser:** Preview events directly inside the app before downloading or subscribing.
- **Webcal / One-Click Subscriptions:** Easily copy `webcal://` URLs to subscribe in Apple Calendar, Google Calendar, Outlook, and more.
- **Automated Issue-Based Submissions:** Users can submit new `.ics` files via a pre-filled GitHub Issue form.
- **GitHub Actions Auto-Publishing:** A custom workflow automatically parses issue submissions, saves `.ics` files to the repository, updates `calendars.json`, and deploys the new calendar live.
- **Local File Testing:** Drag and drop or upload local `.ics` files to preview events instantly.
- **Dark Mode Support:** Built-in light/dark theme toggle.

---

## 📂 Repository Structure

```text
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   └── calendar-submission.md   # Markdown issue form for submissions
│   └── workflows/
│       └── process-calendar.yml     # Workflow to process submissions & update JSON
├── calendars/                       # Storage folder for hosted .ics files
│   ├── tech/
│   ├── holidays/
│   └── other/
├── app.js                           # Core frontend application & parser logic
├── calendars.json                   # Database of public calendars
├── index.html                       # Main UI template
└── README.md                        # Documentation

```

---

## 🛠️ How Automated Submissions Work

1. **User Fills Out Form:** Clicking **"Submit Calendar"** in the web app opens a pre-populated GitHub Issue with the calendar metadata and `.ics` file contents formatted in Markdown.
2. **Issue Event Triggers Workflow:** The submission applies the `calendar-submission` label, triggering `.github/workflows/process-calendar.yml`.
3. **Automated Parsing:** Node.js extracts the title, category, description, and raw `BEGIN:VCALENDAR` payload.
4. **Data Publishing:**
* Saves the `.ics` file into `calendars/<category>/<slug>.ics`.
* Appends/updates the entry inside `calendars.json`.
* Posts a success comment on the issue and auto-closes it.
* Commits and pushes the updated repository state live.



---

## 🏷️ Supported Categories

* `Tech`
* `Holidays`
* `Sports`
* `TV & Movies`
* `Gaming`
* `Music`
* `Finance`
* `Education`
* `Health & Fitness`
* `Entertainment`
* `Science`
* `Community`
* `Other` *(Default fallback for unlisted categories)*

---

## 💻 Local Development Setup

Because modern browsers enforce strict security rules on local `file://` protocols, run the project through a local HTTP server:

1. Clone the repository:
```bash
git clone [https://github.com/CodeWorksCreativeHub/iCalShare.git](https://github.com/CodeWorksCreativeHub/iCalShare.git)
cd iCalShare

```


2. Start a local server:
```bash
python3 -m http.server 8000

```


3. Open `http://localhost:8000` in your browser.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
