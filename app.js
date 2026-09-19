// Change this to your GitHub username and repository name!
var GITHUB_REPO_OWNER = "YOUR_GITHUB_USERNAME";
var GITHUB_REPO_NAME = "my-icalshare";

// Default fallback data for local file:// testing
var DEFAULT_CALENDARS = [
	{
		id: "tech-conferences-2026",
		title: "Global Tech Conferences 2026",
		category: "Tech",
		description: "Key tech event dates for developers, AI researchers, and engineers.",
		file: "calendars/tech/tech-conferences-2026.ics",
	},
	{
		id: "us-holidays-2026",
		title: "US Federal Holidays 2026",
		category: "Holidays",
		description: "Standard federal public holidays observed across the United States.",
		file: "calendars/holidays/us-holidays-2026.ics",
	},
];

var calendarsData = [];

// DOM Elements
var calendarGrid = document.getElementById("calendarGrid");
var searchInput = document.getElementById("searchInput");
var categoryFilter = document.getElementById("categoryFilter");

var submitModal = document.getElementById("submitModal");
var openSubmitModalBtn = document.getElementById("openSubmitModalBtn");
var closeSubmitModalBtn = document.getElementById("closeSubmitModalBtn");
var submissionForm = document.getElementById("submissionForm");

var previewModal = document.getElementById("previewModal");
var closePreviewModalBtn = document.getElementById("closePreviewModalBtn");
var previewTitle = document.getElementById("previewTitle");
var previewDesc = document.getElementById("previewDesc");
var previewEvents = document.getElementById("previewEvents");
var downloadIcsBtn = document.getElementById("downloadIcsBtn");
var copyWebcalBtn = document.getElementById("copyWebcalBtn");

// Initialize application
window.addEventListener("DOMContentLoaded", function () {
	loadCalendars();

	// Filter Listeners
	if (searchInput) searchInput.addEventListener("input", filterCalendars);
	if (categoryFilter) categoryFilter.addEventListener("change", filterCalendars);

	// Modal Handlers
	if (openSubmitModalBtn) {
		openSubmitModalBtn.addEventListener("click", function () {
			submitModal.classList.add("active");
		});
	}

	if (closeSubmitModalBtn) {
		closeSubmitModalBtn.addEventListener("click", function () {
			submitModal.classList.remove("active");
		});
	}

	if (closePreviewModalBtn) {
		closePreviewModalBtn.addEventListener("click", function () {
			previewModal.classList.remove("active");
		});
	}

	// Submit Form -> Redirect to GitHub Issue Template
	if (submissionForm) {
		submissionForm.addEventListener("submit", function (e) {
			e.preventDefault();

			var title = encodeURIComponent(document.getElementById("subTitle").value);
			var category = encodeURIComponent(document.getElementById("subCategory").value);
			var desc = encodeURIComponent(document.getElementById("subDesc").value);
			var ics = encodeURIComponent(document.getElementById("subIcsContent").value);

			var issueUrl = "https://github.com/" + GITHUB_REPO_OWNER + "/" + GITHUB_REPO_NAME + "/issues/new?template=calendar-submission.yml" + "&title=" + title + "&category=" + category + "&description=" + desc + "&ics_content=" + ics;

			window.open(issueUrl, "_blank");
			submitModal.classList.remove("active");
			submissionForm.reset();
		});
	}
});

// Load Calendars safely across local (file://) and HTTP origins
function loadCalendars() {
	if (window.location.protocol === "file:") {
		console.warn("Running via file:// protocol. Using default fallback calendar data.");
		calendarsData = DEFAULT_CALENDARS;
		renderCalendars(calendarsData);
		return;
	}

	fetch("calendars.json")
		.then(function (response) {
			if (!response.ok) throw new Error("Network response failed");
			return response.json();
		})
		.then(function (data) {
			calendarsData = data;
			renderCalendars(calendarsData);
		})
		.catch(function (err) {
			console.error("Error loading calendars.json:", err);
			calendarsData = DEFAULT_CALENDARS;
			renderCalendars(calendarsData);
		});
}

function renderCalendars(items) {
	if (!calendarGrid) return;
	calendarGrid.innerHTML = "";

	if (!items || items.length === 0) {
		calendarGrid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: var(--text-muted);'>No matching calendars found.</p>";
		return;
	}

	items.forEach(function (item) {
		var card = document.createElement("div");
		card.className = "card";

		card.innerHTML = '<div class="card-category">' + escapeHtml(item.category) + "</div>" + '<div class="card-title">' + escapeHtml(item.title) + "</div>" + '<div class="card-desc">' + escapeHtml(item.description) + "</div>" + '<div class="card-footer">' + '<button class="btn btn-secondary preview-btn" style="flex:1;">Preview</button>' + '<a href="' + escapeHtml(item.file) + '" class="btn" download style="text-decoration:none;">Download</a>' + "</div>";

		var previewBtn = card.querySelector(".preview-btn");
		previewBtn.addEventListener("click", function () {
			openPreview(item);
		});

		calendarGrid.appendChild(card);
	});
}

function filterCalendars() {
	var query = searchInput ? searchInput.value.toLowerCase() : "";
	var cat = categoryFilter ? categoryFilter.value : "ALL";

	var filtered = calendarsData.filter(function (item) {
		var matchesCat = cat === "ALL" || item.category === cat;
		var matchesSearch = item.title.toLowerCase().indexOf(query) !== -1 || item.description.toLowerCase().indexOf(query) !== -1;
		return matchesCat && matchesSearch;
	});

	renderCalendars(filtered);
}

// ICS Preview and Parsing Logic
function openPreview(item) {
	if (previewTitle) previewTitle.textContent = item.title;
	if (previewDesc) previewDesc.textContent = item.description;
	if (downloadIcsBtn) downloadIcsBtn.href = item.file;

	var absoluteUrl = window.location.origin + window.location.pathname.replace("index.html", "") + item.file;
	var webcalUrl = absoluteUrl.replace(/^https?:\/\//, "webcal://");

	if (copyWebcalBtn) {
		copyWebcalBtn.onclick = function () {
			navigator.clipboard.writeText(webcalUrl).then(function () {
				alert("Subscription URL copied to clipboard!");
			});
		};
	}

	if (previewEvents) previewEvents.innerHTML = "Loading events...";
	if (previewModal) previewModal.classList.add("active");

	if (window.location.protocol === "file:") {
		if (previewEvents) {
			previewEvents.innerHTML = "<p style='color: var(--text-muted); padding: 0.5rem;'>Event preview fetch is limited when opening via file://. Run local server or host on GitHub Pages to parse remote .ics files live.</p>";
		}
		return;
	}

	fetch(item.file)
		.then(function (res) {
			return res.text();
		})
		.then(function (icsText) {
			var events = parseICS(icsText);
			renderParsedEvents(events);
		})
		.catch(function () {
			if (previewEvents) previewEvents.innerHTML = "<p>Could not load calendar events file.</p>";
		});
}

function parseICS(icsText) {
	var events = [];
	if (!icsText) return events;

	// 1. Unfold lines (lines split with a trailing newline + leading space/tab)
	var unfolded = icsText.replace(/\r\n[ \t]|\r[ \t]|\n[ \t]/g, "");
	var lines = unfolded.split(/\r\n|\n|\r/);

	var currentEvent = null;

	for (var i = 0; i < lines.length; i++) {
		var line = lines[i].trim();

		if (line === "BEGIN:VEVENT") {
			currentEvent = {};
		} else if (line === "END:VEVENT" && currentEvent) {
			if (currentEvent.summary || currentEvent.dtstart) {
				events.push(currentEvent);
			}
			currentEvent = null;
		} else if (currentEvent) {
			// Split on the FIRST colon to separate property header from value
			var colonIndex = line.indexOf(":");
			if (colonIndex !== -1) {
				var header = line.substring(0, colonIndex).toUpperCase();
				var value = line.substring(colonIndex + 1).trim();

				// Match SUMMARY or SUMMARY;PROPERTY
				if (header === "SUMMARY" || header.indexOf("SUMMARY;") === 0) {
					currentEvent.summary = value;
				}
				// Match DTSTART or DTSTART;PROPERTY
				else if (header === "DTSTART" || header.indexOf("DTSTART;") === 0) {
					currentEvent.dtstart = value;
				}
			}
		}
	}

	return events;
}

function renderParsedEvents(events) {
	if (!previewEvents) return;

	if (!events || events.length === 0) {
		previewEvents.innerHTML = "<p>No events found in this .ics file.</p>";
		return;
	}

	var html = "";
	events.slice(0, 10).forEach(function (e) {
		var dateStr = formatDate(e.dtstart || "");
		html += '<div class="event-item">' + '<div class="event-date">' + escapeHtml(dateStr) + "</div>" + '<div class="event-summary">' + escapeHtml(e.summary || "Untitled Event") + "</div>" + "</div>";
	});

	previewEvents.innerHTML = html;
}

function formatDate(rawStr) {
	if (!rawStr) return "N/A";
	var clean = rawStr.replace(/[^0-9]/g, "");
	if (clean.length >= 8) {
		var y = clean.substring(0, 4);
		var m = clean.substring(4, 6);
		var d = clean.substring(6, 8);
		return y + "-" + m + "-" + d;
	}
	return rawStr;
}

function escapeHtml(str) {
	if (!str) return "";
	return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
