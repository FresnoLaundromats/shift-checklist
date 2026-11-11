const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwu_8JdvWRTPtKaT_8wcXj2F_53LrsfimY9g41QPuMgcV9-SfrhKBFJCF8uvsFPR8ES/exec";
const DEMO_MODE = new URLSearchParams(window.location.search).get("demo") === "1";
const LOCAL_KEY = "shiftChecklistManagerKey";
const SESSION_KEY = "shiftChecklistManagerSessionKey";

const state = {
  accessKey: "",
  data: null,
  days: 30,
  reportDate: localDateKey(new Date()),
  view: "overview",
  loading: false,
};

const elements = {
  authScreen: document.getElementById("authScreen"),
  authForm: document.getElementById("authForm"),
  accessCode: document.getElementById("accessCode"),
  rememberAccess: document.getElementById("rememberAccess"),
  authError: document.getElementById("authError"),
  dashboardShell: document.getElementById("dashboardShell"),
  dataUpdated: document.getElementById("dataUpdated"),
  viewTitle: document.getElementById("viewTitle"),
  viewKicker: document.getElementById("viewKicker"),
  rangeControl: document.getElementById("rangeControl"),
  refreshButton: document.getElementById("refreshButton"),
  lockButton: document.getElementById("lockButton"),
  demoBanner: document.getElementById("demoBanner"),
  statusBanner: document.getElementById("statusBanner"),
  overviewMetrics: document.getElementById("overviewMetrics"),
  nightlySnapshot: document.getElementById("nightlySnapshot"),
  leaderboardSnapshot: document.getElementById("leaderboardSnapshot"),
  storeRangeLabel: document.getElementById("storeRangeLabel"),
  storeTableBody: document.getElementById("storeTableBody"),
  nightlyDate: document.getElementById("nightlyDate"),
  nightlyMetrics: document.getElementById("nightlyMetrics"),
  nightlyHeading: document.getElementById("nightlyHeading"),
  coverageNote: document.getElementById("coverageNote"),
  nightlyTableBody: document.getElementById("nightlyTableBody"),
  employeeSearch: document.getElementById("employeeSearch"),
  employeeStatusFilter: document.getElementById("employeeStatusFilter"),
  employeeCount: document.getElementById("employeeCount"),
  employeeTableBody: document.getElementById("employeeTableBody"),
  leaderboardRangeLabel: document.getElementById("leaderboardRangeLabel"),
  leaderboardFull: document.getElementById("leaderboardFull"),
  employeeDialog: document.getElementById("employeeDialog"),
  employeeDialogName: document.getElementById("employeeDialogName"),
  employeeDialogPhone: document.getElementById("employeeDialogPhone"),
  employeeDialogBody: document.getElementById("employeeDialogBody"),
  closeEmployeeDialog: document.getElementById("closeEmployeeDialog"),
};

const viewCopy = {
  overview: ["Operations", "Overview"],
  nightly: ["Closing accountability", "Nightly Summary"],
  employees: ["People", "Employees"],
  leaderboard: ["Recognition", "Leaderboard"],
};

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function safeWebUrl(value) {
  try {
    const url = new URL(String(value || ""), window.location.href);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "#";
  } catch {
    return "#";
  }
}

function phoneHref(value) {
  return `tel:${String(value || "").replace(/[^\d+]/g, "")}`;
}

function formatDate(value, options = {}) {
  if (!value) return "Not available";
  const text = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T12:00:00` : value;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString([], {
    month: options.long ? "long" : "short",
    day: "numeric",
    year: options.year === false ? undefined : "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function statusLabel(status, noSubmission) {
  if (noSubmission) return "No checklist";
  if (status === "green") return "Complete";
  if (status === "orange") return "Follow-up";
  return "Action required";
}

function metricCard(value, label, detail, tone = "blue") {
  return `<article class="metric-card ${tone}">
    <strong class="metric-value">${escapeHtml(value)}</strong>
    <span class="metric-label">${escapeHtml(label)}</span>
    <span class="metric-detail">${escapeHtml(detail)}</span>
  </article>`;
}

function showStatus(message, isError = false) {
  elements.statusBanner.hidden = !message;
  elements.statusBanner.textContent = message || "";
  elements.statusBanner.classList.toggle("error", isError);
}

function getStoredAccessKey() {
  return sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(LOCAL_KEY) || "";
}

function saveAccessKey(key, remember) {
  state.accessKey = key;
  sessionStorage.setItem(SESSION_KEY, key);
  if (remember) localStorage.setItem(LOCAL_KEY, key);
}

function clearAccessKey() {
  state.accessKey = "";
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LOCAL_KEY);
}

function openDashboard() {
  elements.authScreen.hidden = true;
  elements.dashboardShell.hidden = false;
}

function lockDashboard() {
  clearAccessKey();
  state.data = null;
  elements.dashboardShell.hidden = true;
  elements.authScreen.hidden = false;
  elements.accessCode.value = "";
  elements.authError.textContent = "";
  elements.accessCode.focus();
}

function setView(view) {
  if (!viewCopy[view]) return;
  state.view = view;
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll(".dashboard-view").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === view);
  });
  elements.viewKicker.textContent = viewCopy[view][0];
  elements.viewTitle.textContent = viewCopy[view][1];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function managerRequest(key, days, reportDate) {
  return new Promise((resolve, reject) => {
    const callback = `__shiftChecklistDashboard${Date.now()}${Math.floor(Math.random() * 10000)}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => finish(new Error("The dashboard took too long to respond.")), 25000);

    function finish(error, value) {
      window.clearTimeout(timeout);
      delete window[callback];
      script.remove();
      error ? reject(error) : resolve(value);
    }

    window[callback] = (value) => finish(null, value);
    script.onerror = () => finish(new Error("The dashboard data could not be loaded."));
    const query = new URLSearchParams({
      action: "manager-dashboard",
      key,
      days: String(days),
      date: reportDate,
      callback,
    });
    script.src = `${BACKEND_URL}?${query.toString()}`;
    document.head.appendChild(script);
  });
}

async function loadDashboard({ fromLogin = false } = {}) {
  if (state.loading) return;
  state.loading = true;
  elements.refreshButton.disabled = true;
  showStatus("Refreshing checklist data...");

  try {
    const data = DEMO_MODE
      ? buildDemoData(state.days, state.reportDate)
      : await managerRequest(state.accessKey, state.days, state.reportDate);
    if (!data || !data.ok) {
      const error = new Error(data?.message || "The dashboard could not be opened.");
      error.code = data?.error || "unknown";
      throw error;
    }
    state.data = data;
    openDashboard();
    renderDashboard();
    showStatus("");
  } catch (error) {
    if (fromLogin || error.code === "unauthorized" || error.code === "not_configured") {
      clearAccessKey();
      elements.dashboardShell.hidden = true;
      elements.authScreen.hidden = false;
      elements.authError.textContent = error.message;
      elements.accessCode.focus();
    } else {
      showStatus(error.message || "The dashboard could not be refreshed.", true);
    }
  } finally {
    state.loading = false;
    elements.refreshButton.disabled = false;
  }
}

function renderDashboard() {
  const data = state.data;
  if (!data) return;
  elements.dataUpdated.textContent = `Updated ${formatDateTime(data.generatedAt)}`;
  elements.nightlyDate.value = data.reportDate || state.reportDate;
  elements.demoBanner.hidden = !DEMO_MODE;
  elements.rangeControl.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.days) === state.days);
  });
  renderOverview(data);
  renderNightly(data);
  renderEmployees(data);
  renderLeaderboard(data);
}

function renderOverview(data) {
  const overview = data.overview || {};
  elements.overviewMetrics.innerHTML = [
    metricCard(`${overview.averageCompletion || 0}%`, "Average completion", `${overview.submissions || 0} submitted shifts`, overview.averageCompletion >= 90 ? "green" : "orange"),
    metricCard(overview.perfectShifts || 0, "Perfect shifts", "All tasks and photos complete", "green"),
    metricCard(`${overview.photoCompliance || 0}%`, "Photo compliance", "Required proof submitted", overview.photoCompliance >= 90 ? "blue" : "orange"),
    metricCard(overview.followUpShifts || 0, "Need follow-up", `${overview.nightlyNoChecklist || 0} missing tonight`, overview.followUpShifts ? "red" : "green"),
  ].join("");

  const nightlyRows = (data.nightly?.rows || []).slice(0, 6);
  elements.nightlySnapshot.innerHTML = nightlyRows.length
    ? `<ul class="snapshot-list">${nightlyRows.map((row) => `<li class="snapshot-row">
        <span class="status-stripe ${escapeHtml(row.status)}"></span>
        <span class="snapshot-store"><strong>${escapeHtml(row.location)}</strong><span>${escapeHtml(statusLabel(row.status, row.noSubmission))}</span></span>
        <span class="snapshot-name"><strong>${escapeHtml(row.employee)}</strong><span>${escapeHtml(row.phone || "Phone not entered")}</span></span>
        <span class="snapshot-score">${row.noSubmission ? "Missing" : `${escapeHtml(row.completionRate)}% · ${escapeHtml(row.points)} pts`}</span>
      </li>`).join("")}</ul>`
    : `<div class="empty-state">No nightly checklist activity is available for this date.</div>`;

  const leaders = (data.leaderboard || []).slice(0, 5);
  elements.leaderboardSnapshot.innerHTML = leaders.length
    ? `<ol class="leader-list">${leaders.map((employee) => `<li class="leader-row">
        <span class="rank">${escapeHtml(employee.rank)}</span>
        <span class="leader-name"><strong>${escapeHtml(employee.name)}</strong><span>${escapeHtml(employee.perfectShifts)} perfect · ${escapeHtml(employee.submissions)} shifts</span></span>
        <span class="leader-points">${escapeHtml(employee.points)} pts</span>
      </li>`).join("")}</ol>`
    : `<div class="empty-state">Points will appear after checklist submissions arrive.</div>`;

  const stores = [...(data.stores || [])].sort((a, b) => b.followUpShifts - a.followUpShifts || a.averageCompletion - b.averageCompletion || a.name.localeCompare(b.name));
  elements.storeRangeLabel.textContent = data.range?.label || "Current range";
  elements.storeTableBody.innerHTML = stores.length
    ? stores.map((store) => `<tr>
        <td><span class="table-title">${escapeHtml(store.name)}</span></td>
        <td><span class="completion-value ${store.averageCompletion >= 90 ? "green" : store.averageCompletion >= 75 ? "orange" : "red"}">${escapeHtml(store.averageCompletion)}%</span></td>
        <td>${escapeHtml(store.perfectShifts)} of ${escapeHtml(store.submissions)}</td>
        <td>${escapeHtml(store.followUpShifts)}</td>
        <td>${escapeHtml(store.employeeCount)}</td>
      </tr>`).join("")
    : `<tr><td colspan="5" class="empty-state">No store activity is available in this range.</td></tr>`;
}

function renderNightly(data) {
  const report = data.nightly || { counts: {}, rows: [] };
  const counts = report.counts || {};
  elements.nightlyHeading.textContent = report.longDate || formatDate(data.reportDate, { long: true });
  elements.coverageNote.textContent = report.coverageAvailable
    ? "Schedule coverage checked"
    : "Store Coverage is not connected yet";
  elements.nightlyMetrics.innerHTML = [
    metricCard(counts.green || 0, "Complete", "100% with all photos", "green"),
    metricCard(counts.orange || 0, "Follow-up", "75-99% or missing photos", "orange"),
    metricCard(counts.red || 0, "Action required", "Below 75% or no checklist", "red"),
    metricCard(counts.noSubmission || 0, "No checklist", "Scheduled but not submitted", "blue"),
  ].join("");

  elements.nightlyTableBody.innerHTML = report.rows?.length
    ? report.rows.map((row) => {
        const phone = row.phone
          ? `<a class="phone-link" href="${phoneHref(row.phone)}">${escapeHtml(row.phone)}</a>`
          : `<span class="phone-missing">Phone not entered</span>`;
        const photoLinks = (row.photoLinks || []).map((photo) => `<a href="${safeWebUrl(photo.url)}" target="_blank" rel="noopener">${escapeHtml(shortPhotoName(photo.task))}</a>`).join("");
        const issueItems = nightlyIssueItems(row);
        return `<tr>
          <td data-label="Status"><span class="status-badge ${escapeHtml(row.status)}">${escapeHtml(statusLabel(row.status, row.noSubmission))}</span></td>
          <td data-label="Store"><span class="table-title">${escapeHtml(row.location)}</span></td>
          <td data-label="Employee"><span class="table-title">${escapeHtml(row.employee)}</span>${phone}</td>
          <td data-label="Completion"><span class="completion-value ${escapeHtml(row.status)}">${row.noSubmission ? "Missing" : `${escapeHtml(row.completionRate)}%`}</span><span class="table-subtext">${escapeHtml(row.completeCount)}/${escapeHtml(row.itemCount)} tasks</span></td>
          <td data-label="Points"><span class="points-value">${escapeHtml(row.points || 0)}</span></td>
          <td data-label="Photos"><span class="completion-value ${row.allPhotosSubmitted ? "green" : "red"}">${row.allPhotosSubmitted ? "Complete" : "Missing"}</span><div class="photo-link-list">${photoLinks}</div></td>
          <td data-label="Issue"><ul class="issue-list">${issueItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="7" class="empty-state">No checklist or coverage records are available for this night.</td></tr>`;
}

function nightlyIssueItems(row) {
  if (row.noSubmission) return ["No checklist submitted. Contact employee and verify closing."];
  const items = [];
  if (row.missedTasks?.length) items.push(`Missed: ${row.missedTasks.join(", ")}`);
  if (row.missingPhotos?.length) items.push(`Missing photos: ${row.missingPhotos.join(", ")}`);
  if (row.notes) items.push(`Reported: ${row.notes}`);
  if (!items.length) items.push("All tasks and required photos completed.");
  return items;
}

function shortPhotoName(task) {
  if (/soap/i.test(task || "")) return "Soap";
  if (/lint/i.test(task || "")) return "Lint";
  if (/special|window|parking|bush|paint|employee|dumpster/i.test(task || "")) return "Special";
  return String(task || "Photo").slice(0, 18);
}

function filteredEmployees(data) {
  const search = normalizeText(elements.employeeSearch.value);
  const filter = elements.employeeStatusFilter.value;
  return (data.employees || []).filter((employee) => {
    const haystack = normalizeText([employee.name, employee.phone, ...(employee.stores || []).map((store) => store.name)].join(" "));
    if (search && !haystack.includes(search)) return false;
    if (filter === "follow-up" && !(employee.submissions && (employee.averageCompletion < 90 || employee.photoCompliance < 100))) return false;
    if (filter === "strong" && !(employee.submissions && employee.averageCompletion >= 90 && employee.photoCompliance >= 90)) return false;
    if (filter === "inactive" && employee.submissions > 0) return false;
    return true;
  });
}

function renderEmployees(data) {
  const employees = filteredEmployees(data);
  elements.employeeCount.textContent = `${employees.length} employee${employees.length === 1 ? "" : "s"}`;
  elements.employeeTableBody.innerHTML = employees.length
    ? employees.map((employee) => {
        const phone = employee.phone
          ? `<a class="phone-link" href="${phoneHref(employee.phone)}" onclick="event.stopPropagation()">${escapeHtml(employee.phone)}</a>`
          : `<span class="phone-missing">Add phone in Employee Directory</span>`;
        const stores = employee.stores?.length
          ? `<div class="store-tags">${employee.stores.map((store) => `<span class="store-tag">${escapeHtml(store.name)} · ${escapeHtml(store.shifts)}</span>`).join("")}</div>`
          : `<span class="phone-missing">No stores in this range</span>`;
        return `<tr data-employee="${escapeHtml(employee.name)}" tabindex="0">
          <td data-label="Employee"><span class="table-title">${escapeHtml(employee.name)}</span>${phone}</td>
          <td data-label="Stores worked">${stores}</td>
          <td data-label="Shifts">${escapeHtml(employee.submissions)}</td>
          <td data-label="Average"><span class="completion-value ${employee.averageCompletion >= 90 ? "green" : employee.averageCompletion >= 75 ? "orange" : "red"}">${escapeHtml(employee.averageCompletion)}%</span></td>
          <td data-label="Photos">${escapeHtml(employee.photoCompliance)}%</td>
          <td data-label="Perfect">${escapeHtml(employee.perfectShifts)}</td>
          <td data-label="Points"><span class="points-value">${escapeHtml(employee.points)}</span></td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="7" class="empty-state">No employees match these filters.</td></tr>`;
}

function renderLeaderboard(data) {
  const leaders = data.leaderboard || [];
  elements.leaderboardRangeLabel.textContent = data.range?.label || "Current range";
  elements.leaderboardFull.innerHTML = leaders.length
    ? `<ol class="leaderboard-full-list">${leaders.map((employee) => `<li class="leaderboard-full-row ${employee.rank <= 3 ? "top-three" : ""}">
        <span class="rank">${escapeHtml(employee.rank)}</span>
        <span class="leader-main"><strong>${escapeHtml(employee.name)}</strong><span>${escapeHtml(employee.phone || "Phone not entered")}</span></span>
        <span class="leader-stores"><div class="store-tags">${(employee.stores || []).slice(0, 3).map((store) => `<span class="store-tag">${escapeHtml(store.name)}</span>`).join("")}</div></span>
        <span class="leader-stat"><strong>${escapeHtml(employee.perfectShifts)}</strong><span>perfect</span></span>
        <span class="leader-stat"><strong>${escapeHtml(employee.averageCompletion)}%</strong><span>average</span></span>
        <span class="leader-total">${escapeHtml(employee.points)} pts</span>
      </li>`).join("")}</ol>`
    : `<div class="empty-state">The leaderboard will appear after employees submit checklists.</div>`;
}

function openEmployeeHistory(employeeName) {
  const data = state.data;
  const employee = data?.employees?.find((entry) => normalizeText(entry.name) === normalizeText(employeeName));
  if (!employee) return;
  const history = (data.submissions || []).filter((submission) => normalizeText(submission.employee) === normalizeText(employee.name));
  elements.employeeDialogName.textContent = employee.name;
  elements.employeeDialogPhone.textContent = employee.phone || "Phone not entered";
  elements.employeeDialogPhone.href = employee.phone ? phoneHref(employee.phone) : "#";
  elements.employeeDialogPhone.classList.toggle("phone-missing", !employee.phone);
  elements.employeeDialogBody.innerHTML = employeeHistoryMarkup(employee, history, data.range?.label || "Current range");
  elements.employeeDialog.showModal();
}

function employeeHistoryMarkup(employee, history, rangeLabel) {
  const stores = employee.stores?.length
    ? employee.stores.map((store) => `<li><strong>${escapeHtml(store.name)}</strong><span>${escapeHtml(store.shifts)} shift${store.shifts === 1 ? "" : "s"}</span></li>`).join("")
    : `<li><span>No store history in this range</span></li>`;
  const missed = employee.topMissedTasks?.length
    ? employee.topMissedTasks.map((task) => `<li><strong>${escapeHtml(task.task)}</strong><span>${escapeHtml(task.misses)} miss${task.misses === 1 ? "" : "es"}</span></li>`).join("")
    : `<li><span>No repeated missed tasks in this range</span></li>`;
  const recent = history.slice(0, 12);
  const historyRows = recent.length
    ? recent.map((submission) => `<li class="history-row">
        <span>${escapeHtml(formatDate(submission.date, { year: false }))}</span>
        <strong>${escapeHtml(submission.location)}</strong>
        <span class="completion-value ${escapeHtml(submission.status)}">${escapeHtml(submission.completionRate)}%</span>
        <span class="history-points">${escapeHtml(submission.points)} pts</span>
      </li>`).join("")
    : `<li class="empty-state">No checklist history in this range.</li>`;
  const trend = recent.slice().reverse();
  const trendBars = trend.length
    ? trend.map((submission) => `<div class="trend-bar-wrap" title="${escapeHtml(submission.date)}: ${escapeHtml(submission.completionRate)}%">
        <div class="trend-bar" style="height:${Math.max(3, submission.completionRate * 0.7)}px;background:${submission.status === "green" ? "var(--green)" : submission.status === "orange" ? "var(--orange)" : "var(--red)"}"></div>
        <span>${escapeHtml(String(submission.date).slice(5))}</span>
      </div>`).join("")
    : `<div class="empty-state">No trend yet.</div>`;

  return `<div class="employee-summary-grid">
      ${metricCard(employee.points, "Points", rangeLabel, "blue")}
      ${metricCard(`${employee.averageCompletion}%`, "Average", `${employee.submissions} shifts`, employee.averageCompletion >= 90 ? "green" : "orange")}
      ${metricCard(employee.perfectShifts, "Perfect shifts", `${employee.perfectRate}% of shifts`, "green")}
      ${metricCard(`${employee.photoCompliance}%`, "Photo compliance", "Required proof", employee.photoCompliance >= 90 ? "blue" : "red")}
    </div>
    <div class="detail-grid">
      <div>
        <section class="detail-section">
          <h3>Stores worked</h3>
          <ul class="detail-list">${stores}</ul>
        </section>
        <section class="detail-section" style="margin-top:14px;">
          <h3>Most missed tasks</h3>
          <ul class="detail-list">${missed}</ul>
        </section>
      </div>
      <div>
        <section class="detail-section">
          <h3>Completion trend</h3>
          <div class="trend-bars">${trendBars}</div>
        </section>
        <section class="detail-section" style="margin-top:14px;">
          <h3>Recent checklist history</h3>
          <ul class="history-list">${historyRows}</ul>
        </section>
      </div>
    </div>`;
}

function buildDemoData(days, reportDate) {
  const people = [
    { name: "Maria Lopez", phone: "(559) 555-0142", stores: ["Barstow", "Shaw"], rates: [100, 100, 94, 100, 100, 100] },
    { name: "David Reed", phone: "(559) 555-0187", stores: ["Ceres", "Merced"], rates: [100, 88, 100, 94, 100, 81] },
    { name: "Angela Ruiz", phone: "(559) 555-0128", stores: ["KC1", "KC2"], rates: [94, 100, 88, 100, 94, 100] },
    { name: "Robert King", phone: "(559) 555-0193", stores: ["Blackstone"], rates: [69, 81, 75, 88, 63, 81] },
    { name: "Tina Patel", phone: "(559) 555-0166", stores: ["Olive", "McKin"], rates: [100, 94, 100, 100, 88, 100] },
    { name: "Grace Hill", phone: "(559) 555-0119", stores: ["Selma", "Tulare"], rates: [88, 75, 94, 81, 88, 75] },
  ];
  const missedOptions = ["Soap dishes", "Vacuum Lint Trays", "Mop Floor", "Clean Bathroom"];
  const submissions = [];
  people.forEach((person, personIndex) => {
    person.rates.forEach((rate, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (index * 3 + personIndex % 3));
      const itemCount = 16;
      const completeCount = Math.round(itemCount * rate / 100);
      const missingPhotoCount = rate === 100 ? 0 : (index + personIndex) % 3 === 0 ? 1 : 0;
      const perfect = rate === 100 && missingPhotoCount === 0;
      submissions.push({
        id: `demo-${personIndex}-${index}`,
        submittedAt: date.toISOString(),
        date: localDateKey(date),
        location: person.stores[index % person.stores.length],
        employee: person.name,
        phone: person.phone,
        completionRate: rate,
        completeCount,
        itemCount,
        points: completeCount + (perfect ? 2 : 0),
        perfect,
        status: rate < 75 ? "red" : perfect ? "green" : "orange",
        missingPhotoCount,
        missingPhotos: missingPhotoCount ? [index % 2 ? "Soap dishes" : "Vacuum Lint Trays"] : [],
        missedTasks: rate < 100 ? missedOptions.slice(0, Math.max(1, Math.min(3, itemCount - completeCount))) : [],
        notes: index === 1 && personIndex === 1 ? "Bathroom hand soap is running low." : "",
        photoFolderUrl: "#",
        photos: perfect ? [{ task: "Soap dishes", url: "#" }, { task: "Vacuum Lint Trays", url: "#" }] : [],
      });
    });
  });
  submissions.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const employees = demoEmployeeSummaries(submissions, people);
  const leaderboard = [...employees]
    .sort((a, b) => b.points - a.points || b.perfectShifts - a.perfectShifts)
    .map((employee, index) => ({ ...employee, rank: index + 1 }));
  const stores = demoStoreSummaries(submissions);
  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - days + 1);
  const nightlyRows = [
    demoNightlyRow(people[0], "Barstow", 100, 18, false),
    demoNightlyRow(people[1], "Ceres", 88, 14, false),
    demoNightlyRow(people[2], "KC1", 100, 18, false),
    demoNightlyRow(people[3], "Blackstone", 69, 11, false),
    demoNightlyRow(people[4], "Olive", 94, 15, false),
    demoNightlyRow(people[5], "Selma", null, 0, true),
  ];
  const counts = nightlyRows.reduce((result, row) => {
    result[row.status] += 1;
    if (row.noSubmission) result.noSubmission += 1;
    return result;
  }, { red: 0, orange: 0, green: 0, noSubmission: 0 });
  const perfectShifts = submissions.filter((submission) => submission.perfect).length;
  const photoComplete = submissions.filter((submission) => submission.missingPhotoCount === 0).length;

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    range: { days, startDate: localDateKey(rangeStart), endDate: localDateKey(new Date()), label: days === 365 ? "Last year" : `Last ${days} days` },
    scoring: { taskPoints: 1, perfectBonus: 2, perfectRequiresPhotos: true },
    overview: {
      submissions: submissions.length,
      activeEmployees: employees.length,
      averageCompletion: Math.round(submissions.reduce((sum, item) => sum + item.completionRate, 0) / submissions.length),
      taskCompletion: 91,
      perfectShifts,
      photoCompliance: Math.round(photoComplete / submissions.length * 100),
      followUpShifts: submissions.filter((item) => item.status !== "green").length,
      nightlyNoChecklist: 1,
    },
    reportDate,
    nightly: {
      dateKey: reportDate,
      longDate: formatDate(reportDate, { long: true }),
      shortDate: formatDate(reportDate, { year: false }),
      rows: nightlyRows,
      counts,
      coverageAvailable: true,
      notes: nightlyRows.filter((row) => row.notes),
    },
    leaderboard,
    employees,
    stores,
    submissions,
    directoryConfigured: true,
  };
}

function demoNightlyRow(person, location, rate, points, noSubmission) {
  const completeCount = noSubmission ? 0 : Math.round(16 * rate / 100);
  const perfect = rate === 100;
  return {
    status: noSubmission || rate < 75 ? "red" : perfect ? "green" : "orange",
    location,
    employee: person.name,
    phone: person.phone,
    completionRate: noSubmission ? null : rate,
    completionLabel: noSubmission ? "NO CHECKLIST" : `${rate}%`,
    completeCount,
    itemCount: noSubmission ? 0 : 16,
    points,
    perfect,
    missingPhotos: !noSubmission && !perfect && rate < 90 ? ["Soap dishes"] : [],
    missedTasks: noSubmission ? [] : rate < 100 ? ["Mop Floor", ...(rate < 75 ? ["Clean Bathroom"] : [])] : [],
    photoLinks: perfect ? [{ task: "Soap dishes", url: "#" }, { task: "Vacuum Lint Trays", url: "#" }] : [],
    photoFolderUrl: "#",
    allPhotosSubmitted: perfect || rate >= 90,
    noSubmission,
    notes: person.name === "David Reed" ? "Bathroom hand soap is running low." : "",
  };
}

function demoEmployeeSummaries(submissions, people) {
  return people.map((person) => {
    const records = submissions.filter((submission) => submission.employee === person.name);
    const storeCounts = {};
    const missed = {};
    records.forEach((record) => {
      storeCounts[record.location] = (storeCounts[record.location] || 0) + 1;
      record.missedTasks.forEach((task) => { missed[task] = (missed[task] || 0) + 1; });
    });
    const perfectShifts = records.filter((record) => record.perfect).length;
    return {
      name: person.name,
      phone: person.phone,
      active: true,
      submissions: records.length,
      points: records.reduce((sum, record) => sum + record.points, 0),
      perfectShifts,
      perfectRate: Math.round(perfectShifts / records.length * 100),
      averageCompletion: Math.round(records.reduce((sum, record) => sum + record.completionRate, 0) / records.length),
      photoCompliance: Math.round(records.filter((record) => record.missingPhotoCount === 0).length / records.length * 100),
      completedTasks: records.reduce((sum, record) => sum + record.completeCount, 0),
      availableTasks: records.reduce((sum, record) => sum + record.itemCount, 0),
      lastSubmission: records[0]?.submittedAt || "",
      stores: Object.entries(storeCounts).map(([name, shifts]) => ({ name, shifts })).sort((a, b) => b.shifts - a.shifts),
      topMissedTasks: Object.entries(missed).map(([task, misses]) => ({ task, misses })).sort((a, b) => b.misses - a.misses).slice(0, 5),
    };
  });
}

function demoStoreSummaries(submissions) {
  const groups = {};
  submissions.forEach((submission) => {
    groups[submission.location] ||= [];
    groups[submission.location].push(submission);
  });
  return Object.entries(groups).map(([name, records]) => ({
    name,
    submissions: records.length,
    averageCompletion: Math.round(records.reduce((sum, item) => sum + item.completionRate, 0) / records.length),
    perfectShifts: records.filter((item) => item.perfect).length,
    followUpShifts: records.filter((item) => item.status !== "green").length,
    points: records.reduce((sum, item) => sum + item.points, 0),
    employeeCount: new Set(records.map((item) => item.employee)).size,
  }));
}

elements.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const key = elements.accessCode.value.trim();
  if (!key) return;
  elements.authError.textContent = "Checking access...";
  saveAccessKey(key, elements.rememberAccess.checked);
  await loadDashboard({ fromLogin: true });
});

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.querySelectorAll("[data-go-view]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.goView));
});

elements.rangeControl.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-days]");
  if (!button) return;
  state.days = Number(button.dataset.days);
  await loadDashboard();
});

elements.refreshButton.addEventListener("click", () => loadDashboard());
elements.lockButton.addEventListener("click", lockDashboard);
elements.nightlyDate.addEventListener("change", async () => {
  state.reportDate = elements.nightlyDate.value || localDateKey(new Date());
  await loadDashboard();
});
elements.employeeSearch.addEventListener("input", () => state.data && renderEmployees(state.data));
elements.employeeStatusFilter.addEventListener("change", () => state.data && renderEmployees(state.data));
elements.employeeTableBody.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-employee]");
  if (row) openEmployeeHistory(row.dataset.employee);
});
elements.employeeTableBody.addEventListener("keydown", (event) => {
  const row = event.target.closest("tr[data-employee]");
  if (row && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openEmployeeHistory(row.dataset.employee);
  }
});
elements.closeEmployeeDialog.addEventListener("click", () => elements.employeeDialog.close());
elements.employeeDialog.addEventListener("click", (event) => {
  if (event.target === elements.employeeDialog) elements.employeeDialog.close();
});

if (DEMO_MODE) {
  state.accessKey = "demo";
  openDashboard();
  loadDashboard();
} else {
  const savedKey = getStoredAccessKey();
  if (savedKey) {
    state.accessKey = savedKey;
    elements.authError.textContent = "Opening dashboard...";
    loadDashboard({ fromLogin: true });
  } else {
    elements.accessCode.focus();
  }
}
