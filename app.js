// Change this to your GitHub username and repository name!
var GITHUB_REPO_OWNER = "CodeWorksCreativeHub";
var GITHUB_REPO_NAME = "iCalShare";

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
var resultsCount = document.getElementById("resultsCount");
var activeCategoryBadge = document.getElementById("activeCategoryBadge");
var emptyState = document.getElementById("emptyState");

var themeToggleBtn = document.getElementById("themeToggleBtn");
var themeToggleIcon = document.getElementById("themeToggleIcon");

var icsFileInput = document.getElementById("icsFileInput");
var resetDataBtn = document.getElementById("resetDataBtn");

var submitModal = document.getElementById("submitModal");
var openSubmitModalBtn = document.getElementById("openSubmitModalBtn");
var closeSubmitModalBtn = document.getElementById("closeSubmitModalBtn");
var submissionForm = document.getElementById("submissionForm");

var previewModal = document.getElementById("previewModal");
var closePreviewModalBtn = document.getElementById("closePreviewModalBtn");
var previewTitle = document.getElementById("previewTitle");
var previewDesc = document.getElementById("previewDesc");
var modalCategory = document.getElementById("modalCategory");
var previewEvents = document.getElementById("previewEvents");
var downloadIcsBtn = document.getElementById("downloadIcsBtn");
var copyWebcalBtn = document.getElementById("copyWebcalBtn");

// ============================================================
// Clipboard Helper
// Works with modern Clipboard API and older browsers / HTTP
// ============================================================

function copyToClipboard(text, callback) {
	// Modern Clipboard API
	if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
		navigator.clipboard
			.writeText(text)
			.then(function () {
				callback(true);
			})
			.catch(function () {
				fallbackCopy(text, callback);
			});

		return;
	}

	// Fallback for HTTP, file:// and older browsers
	fallbackCopy(text, callback);
}

function fallbackCopy(text, callback) {
	var textarea = document.createElement("textarea");

	textarea.value = text;
	textarea.setAttribute("readonly", "");
	textarea.style.position = "fixed";
	textarea.style.left = "-9999px";
	textarea.style.top = "0";
	textarea.style.opacity = "0";

	document.body.appendChild(textarea);

	textarea.focus();
	textarea.select();

	var copied = false;

	try {
		copied = document.execCommand("copy");
	} catch (error) {
		copied = false;
	}

	document.body.removeChild(textarea);

	callback(copied);
}

// ============================================================
// Initialize Application
// ============================================================

window.addEventListener("DOMContentLoaded", function () {
	initTheme();
	loadCalendars();

	// Theme Toggle Handler
	if (themeToggleBtn) {
		themeToggleBtn.addEventListener("click", toggleTheme);
	}

	// Local .ics File Upload Listener
	if (icsFileInput) {
		icsFileInput.addEventListener("change", handleFileUpload);
	}

	// Reset Sample Data Listener
	if (resetDataBtn) {
		resetDataBtn.addEventListener("click", function () {
			if (searchInput) searchInput.value = "";
			if (categoryFilter) categoryFilter.value = "ALL";
			loadCalendars();
		});
	}

	// Filter Listeners
	if (searchInput) {
		searchInput.addEventListener("input", filterCalendars);
	}

	if (categoryFilter) {
		categoryFilter.addEventListener("change", filterCalendars);
	}

	// Submit Modal Handlers
	if (openSubmitModalBtn) {
		openSubmitModalBtn.addEventListener("click", function () {
			if (submitModal) {
				submitModal.classList.remove("hidden");
			}
		});
	}

	if (closeSubmitModalBtn) {
		closeSubmitModalBtn.addEventListener("click", function () {
			if (submitModal) {
				submitModal.classList.add("hidden");
			}
		});
	}

	// Preview Modal Handler
	if (closePreviewModalBtn) {
		closePreviewModalBtn.addEventListener("click", function () {
			if (previewModal) {
				previewModal.classList.add("hidden");
			}
		});
	}

	// ========================================================
	// Submit Form
	// Builds a SHORT issue URL and copies the ICS separately
	// ========================================================

	if (submissionForm) {
		submissionForm.addEventListener("submit", function (e) {
			e.preventDefault();

			var subTitleEl = document.getElementById("subTitle");
			var subCategoryEl = document.getElementById("subCategory");
			var subDescEl = document.getElementById("subDesc");
			var fileInput = document.getElementById("subIcsFile");

			var titleVal = subTitleEl ? subTitleEl.value.trim() : "";

			var categoryVal = subCategoryEl ? subCategoryEl.value : "Other";

			var descVal = subDescEl ? subDescEl.value.trim() : "";

			if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
				alert("Please select an .ics file to submit.");
				return;
			}

			var file = fileInput.files[0];

			// Basic file extension check
			if (!/\.ics$/i.test(file.name)) {
				alert("Please select a valid .ics file.");
				return;
			}

			var reader = new FileReader();

			reader.onload = function (event) {
				var icsContent = event.target.result;

				/*
				 * IMPORTANT:
				 *
				 * Do NOT put the ICS content into the issue URL.
				 *
				 * Large ICS files make the URL too long and GitHub
				 * will return:
				 *
				 * "Whoa there! Your request URL is too long."
				 *
				 * Instead, the issue URL only contains the metadata.
				 * The actual ICS content is copied to the clipboard.
				 */

				var issueBody = "### Calendar Title\n" + titleVal + "\n\n" + "### Category\n" + categoryVal + "\n\n" + "### Description\n" + descVal + "\n\n" + "### ICS Content\n\n```ics\n" + "\n" + "```";

				var params = new URLSearchParams({
					template: ".github/ISSUE_TEMPLATE/calendar-submission.md",
					title: "New Calendar: " + titleVal,
					body: issueBody,
				});

				/*
				 * GitHub issue URL.
				 *
				 * The ICS file is NOT included in this URL.
				 */
				var issueUrl = "https://github.com/" + GITHUB_REPO_OWNER + "/" + GITHUB_REPO_NAME + "/issues/new?" + params.toString();

				/*
				 * Copy the ICS contents.
				 *
				 * This uses the Clipboard API when available and
				 * automatically falls back to document.execCommand()
				 * when Clipboard API is unavailable.
				 */
				copyToClipboard(icsContent, function (copied) {
                    if (copied) {
                        alert(
                            "Your calendar submission has been prepared.\n\n" +
                            "The ICS content has been copied to your clipboard.\n\n" +
                            "In the GitHub issue, paste it into the " +
                            "'ICS Content' section, then submit the issue."
                        );
                    } else {
                        alert(
                            "The GitHub issue has been opened, but the " +
                            "ICS content could not be copied automatically.\n\n" +
                            "Please open your .ics file in a text editor, " +
                            "copy its contents, and paste them into the " +
                            "'ICS Content' section of the issue."
                        );
                    }

                    /*
                     * Open GitHub AFTER the alert has been closed.
                     */
                    window.open(issueUrl, "_blank");

                    if (submitModal) {
                        submitModal.classList.add("hidden");
                    }

                    submissionForm.reset();
                });
			};

			reader.onerror = function () {
				alert("Failed to read the .ics file. Please try again.");
			};

			reader.readAsText(file);
		});
	}
});

// ============================================================
// Handler for testing local .ics files uploaded via input
// ============================================================

function handleFileUpload(e) {
	var file = e.target.files[0];

	if (!file) {
		return;
	}

	var reader = new FileReader();

	reader.onload = function (event) {
		var icsText = event.target.result;
		var events = parseICS(icsText);

		// Populate Modal Details
		if (previewTitle) {
			previewTitle.textContent = file.name.replace(/\.ics$/i, "");
		}

		if (previewDesc) {
			previewDesc.textContent = "Local file test (" + (file.size / 1024).toFixed(1) + " KB)";
		}

		if (modalCategory) {
			modalCategory.textContent = "Local File";
		}

		// Hide external download/webcal buttons for local files
		if (downloadIcsBtn) {
			downloadIcsBtn.style.display = "none";
		}

		if (copyWebcalBtn) {
			copyWebcalBtn.style.display = "none";
		}

		// Render Events into Modal
		renderParsedEvents(events);

		// Show Modal
		if (previewModal) {
			previewModal.classList.remove("hidden");
		}

		// Clear input selection
		if (icsFileInput) {
			icsFileInput.value = "";
		}
	};

	reader.onerror = function () {
		alert("Failed to read the .ics file.");
	};

	reader.readAsText(file);
}

// ============================================================
// Theme Management Functions
// ============================================================

function initTheme() {
	var savedTheme = localStorage.getItem("theme");

	if (savedTheme === "light") {
		document.documentElement.classList.remove("dark");
		updateThemeIcon(false);
	} else {
		document.documentElement.classList.add("dark");
		updateThemeIcon(true);
	}
}

function toggleTheme() {
	var isDark = document.documentElement.classList.toggle("dark");

	localStorage.setItem("theme", isDark ? "dark" : "light");

	updateThemeIcon(isDark);
}

function updateThemeIcon(isDark) {
	if (!themeToggleIcon) {
		return;
	}

	if (isDark) {
		themeToggleIcon.className = "fa-solid fa-sun text-amber-400";
	} else {
		themeToggleIcon.className = "fa-solid fa-moon text-slate-600";
	}
}

// ============================================================
// Load Calendars
// Safely supports local file:// and HTTP/HTTPS
// ============================================================

function loadCalendars() {
	if (window.location.protocol === "file:") {
		console.warn("Running via file:// protocol. Using default fallback calendar data.");

		calendarsData = DEFAULT_CALENDARS;
		renderCalendars(calendarsData);
		return;
	}

	fetch("calendars.json")
		.then(function (response) {
			if (!response.ok) {
				throw new Error("Network response failed");
			}

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

// ============================================================
// Render Calendars
// ============================================================

function renderCalendars(items) {
	if (!calendarGrid) {
		return;
	}

	calendarGrid.innerHTML = "";

	if (resultsCount) {
		resultsCount.textContent = "Showing " + items.length + " calendar" + (items.length === 1 ? "" : "s");
	}

	if (!items || items.length === 0) {
		if (emptyState) {
			emptyState.classList.remove("hidden");
		}

		return;
	}

	if (emptyState) {
		emptyState.classList.add("hidden");
	}

	items.forEach(function (item) {
		var card = document.createElement("div");

		card.className = "bg-white dark:bg-slate-900 border " + "border-slate-200 dark:border-slate-800 " + "rounded-2xl p-5 flex flex-col justify-between " + "shadow-sm hover:shadow-md transition-all";

		card.innerHTML =
			"<div>" +
			'<div class="flex justify-between items-center mb-3">' +
			'<span class="text-[10px] font-bold text-blue-700 ' +
			"dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 " +
			"border border-blue-100 dark:border-blue-800/50 " +
			'px-2.5 py-0.5 rounded-md uppercase tracking-wider">' +
			escapeHtml(item.category || "General") +
			"</span>" +
			"</div>" +
			'<h3 class="text-base font-bold text-slate-900 ' +
			'dark:text-white mb-2 leading-snug">' +
			escapeHtml(item.title) +
			"</h3>" +
			'<p class="text-xs text-slate-500 dark:text-slate-400 ' +
			'leading-relaxed mb-4">' +
			escapeHtml(item.description) +
			"</p>" +
			"</div>" +
			'<div class="pt-3 border-t border-slate-100 ' +
			'dark:border-slate-800 flex gap-2">' +
			'<button class="preview-btn flex-1 py-2.5 ' +
			"bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 " +
			"dark:hover:bg-white text-white dark:text-slate-900 " +
			"text-xs font-bold rounded-xl transition-all " +
			'flex items-center justify-center gap-2">' +
			'<i class="fa-regular fa-eye"></i>' +
			"<span>Preview & Subscribe</span>" +
			"</button>" +
			'<a href="' +
			escapeHtml(item.file) +
			'" download class="py-2.5 px-3 bg-slate-100 ' +
			"dark:bg-slate-800 hover:bg-slate-200 " +
			"dark:hover:bg-slate-700 text-slate-700 " +
			"dark:text-slate-300 text-xs font-bold rounded-xl " +
			'transition-all flex items-center justify-center" ' +
			'title="Download .ics">' +
			'<i class="fa-solid fa-download"></i>' +
			"</a>" +
			"</div>";

		var previewBtn = card.querySelector(".preview-btn");

		if (previewBtn) {
			previewBtn.addEventListener("click", function () {
				openPreview(item);
			});
		}

		calendarGrid.appendChild(card);
	});
}

// ============================================================
// Filter Calendars
// ============================================================

function filterCalendars() {
	var query = searchInput ? searchInput.value.toLowerCase() : "";

	var cat = categoryFilter ? categoryFilter.value : "ALL";

	if (activeCategoryBadge) {
		activeCategoryBadge.textContent = "Category: " + cat;
	}

	var filtered = calendarsData.filter(function (item) {
		var matchesCat = cat === "ALL" || item.category === cat;

		var title = item.title || "";

		var description = item.description || "";

		var matchesSearch = title.toLowerCase().indexOf(query) !== -1 || description.toLowerCase().indexOf(query) !== -1;

		return matchesCat && matchesSearch;
	});

	renderCalendars(filtered);
}

// ============================================================
// ICS Preview and Parsing Logic
// ============================================================

function openPreview(item) {
	if (previewTitle) {
		previewTitle.textContent = item.title;
	}

	if (previewDesc) {
		previewDesc.textContent = item.description;
	}

	if (modalCategory) {
		modalCategory.textContent = item.category || "General";
	}

	if (downloadIcsBtn) {
		downloadIcsBtn.style.display = "flex";
		downloadIcsBtn.href = item.file;
	}

	if (copyWebcalBtn) {
		copyWebcalBtn.style.display = "flex";
	}

	/*
	 * Build the absolute URL to the calendar file.
	 */
	var absoluteUrl = window.location.origin + window.location.pathname.replace("index.html", "") + item.file;

	/*
	 * Subscription URL.
	 *
	 * Use webcal:// instead of https:// for calendar
	 * applications that support webcal subscriptions.
	 */
	var webcalUrl = absoluteUrl.replace(/^https?:\/\//i, "webcal://");

	if (copyWebcalBtn) {
		copyWebcalBtn.onclick = function () {
			copyToClipboard(webcalUrl, function (copied) {
				if (copied) {
					alert("Subscription URL copied to clipboard:\n" + webcalUrl);
				} else {
					alert("Could not copy the subscription URL automatically.\n\n" + "Subscription URL:\n" + webcalUrl);
				}
			});
		};
	}

	if (previewEvents) {
		previewEvents.innerHTML = '<p class="text-slate-400 dark:text-slate-500 ' + 'text-xs py-2">Loading events...</p>';
	}

	if (previewModal) {
		previewModal.classList.remove("hidden");
	}

	if (window.location.protocol === "file:") {
		if (previewEvents) {
			previewEvents.innerHTML = "<p class='text-slate-500 dark:text-slate-400 " + "text-xs p-2'>" + "Event preview fetch is limited when opening via " + "file://. Run a local server or host on GitHub Pages " + "to parse remote .ics files live." + "</p>";
		}

		return;
	}

	fetch(item.file)
		.then(function (res) {
			if (!res.ok) {
				throw new Error("Failed to load ICS file");
			}

			return res.text();
		})
		.then(function (icsText) {
			var events = parseICS(icsText);
			renderParsedEvents(events);
		})
		.catch(function () {
			if (previewEvents) {
				previewEvents.innerHTML = "<p class='text-slate-500 dark:text-slate-400 " + "text-xs p-2'>" + "Could not load calendar events file." + "</p>";
			}
		});
}

// ============================================================
// ICS Parser
// ============================================================

function parseICS(icsText) {
	var events = [];

	if (!icsText) {
		return events;
	}

	/*
	 * Unfold RFC 5545 continuation lines.
	 */
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
			var colonIndex = line.indexOf(":");

			if (colonIndex !== -1) {
				var header = line.substring(0, colonIndex).toUpperCase();

				var value = line.substring(colonIndex + 1).trim();

				if (header === "SUMMARY" || header.indexOf("SUMMARY;") === 0) {
					currentEvent.summary = value;
				} else if (header === "DTSTART" || header.indexOf("DTSTART;") === 0) {
					currentEvent.dtstart = value;
				}
			}
		}
	}

	return events;
}

// ============================================================
// Render Parsed Events
// ============================================================

function renderParsedEvents(events) {
	if (!previewEvents) {
		return;
	}

	if (!events || events.length === 0) {
		previewEvents.innerHTML = "<p class='text-slate-500 dark:text-slate-400 " + "text-xs p-2'>" + "No events found in this .ics file." + "</p>";

		return;
	}

	var startOfToday = new Date();

	startOfToday.setHours(0, 0, 0, 0);

	var upcoming = events
		.map(function (e) {
			return {
				event: e,
				date: parseEventDate(e.dtstart || ""),
			};
		})
		.filter(function (item) {
			return item.date && item.date >= startOfToday;
		})
		.sort(function (a, b) {
			return a.date - b.date;
		});

	if (upcoming.length === 0) {
		previewEvents.innerHTML = "<p class='text-slate-500 dark:text-slate-400 " + "text-xs p-2'>" + "No upcoming events." + "</p>";

		return;
	}

	var html = "";

	upcoming.slice(0, 10).forEach(function (item) {
		var dateStr = formatDate(item.event.dtstart || "");

		html += '<div class="flex justify-between ' + "items-center py-2 border-b border-slate-200 " + 'dark:border-slate-800 last:border-none text-xs">' + '<span class="font-semibold text-slate-800 ' + 'dark:text-slate-200">' + escapeHtml(item.event.summary || "Untitled Event") + "</span>" + '<span class="text-[10px] text-blue-600 ' + "dark:text-blue-400 font-mono bg-blue-50 " + 'dark:bg-blue-900/40 px-2 py-0.5 rounded">' + escapeHtml(dateStr) + "</span>" + "</div>";
	});

	previewEvents.innerHTML = html;
}

// ============================================================
// Parse Event Date
// ============================================================

function parseEventDate(rawStr) {
	if (!rawStr) {
		return null;
	}

	var clean = rawStr.replace(/[^0-9]/g, "");

	if (clean.length < 8) {
		return null;
	}

	var y = parseInt(clean.substring(0, 4), 10);

	var m = parseInt(clean.substring(4, 6), 10) - 1;

	var d = parseInt(clean.substring(6, 8), 10);

	if (isNaN(y) || isNaN(m) || isNaN(d)) {
		return null;
	}

	return new Date(y, m, d);
}

// ============================================================
// Format Date
// ============================================================

function formatDate(rawStr) {
	if (!rawStr) {
		return "N/A";
	}

	var clean = rawStr.replace(/[^0-9]/g, "");

	if (clean.length >= 8) {
		var y = clean.substring(0, 4);

		var m = clean.substring(4, 6);

		var d = clean.substring(6, 8);

		return y + "-" + m + "-" + d;
	}

	return rawStr;
}

// ============================================================
// HTML Escape
// ============================================================

function escapeHtml(str) {
	if (!str) {
		return "";
	}

	return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
