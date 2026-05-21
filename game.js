const checklistItems = [
  {
    id: "greet",
    title: "Greet Customers",
    detail: "Hi, my name is ___. Let me know if there is anything I can do to help :)",
  },
  {
    id: "quick-sweep",
    title: "Quick sweep with wide large broom",
    detail: "Do a fast pass through aisles, folding areas, and high-traffic spots so lint and debris never build up.",
  },
  {
    id: "trash",
    title: "Trash out",
    detail: "Empty full cans, replace liners, and take bags to the dumpster before they overflow.",
  },
  {
    id: "soap-dishes",
    title: "Soap dishes",
    detail: "Soap dishes must have zero soap left behind. Wipe every cup clean and upload a clear photo.",
    photoRequired: true,
  },
  {
    id: "lint-traps",
    title: "Empty lint traps",
    detail: "Pull lint from every trap, then vacuum the lint area out completely. Upload a clear photo.",
    photoRequired: true,
  },
  {
    id: "bulkheads",
    title: "Wipe down bulkheads",
    detail: "Wipe visible dust, lint, soap, and fingerprints from the bulkheads and surrounding ledges.",
  },
  {
    id: "machines",
    title: "Wipe machines down inside and out",
    detail: "Wipe fronts, tops, doors, glass, handles, and inside edges. Do not forget the rubber seal around the glass to prevent mold growth.",
  },
  {
    id: "towels",
    title: "Wash towels for next attendant if needed",
    detail: "If towel supply is low, wash and dry towels so the next attendant starts with clean supplies.",
  },
  {
    id: "front-area",
    title: "Tidy up front area and parking lot",
    detail: "Straighten carts and tables, remove trash outside, and make the entrance look clean from the customer view.",
  },
  {
    id: "bathroom",
    title: "Clean bathroom",
    detail: "Clean surfaces, replace toilet paper, refill soap, empty the trash can, and leave the bathroom customer-ready.",
  },
  {
    id: "sweep-floor",
    title: "Sweep floor",
    detail: "Sweep under tables, around machines, corners, aisles, and anywhere lint or debris collects.",
  },
  {
    id: "mop",
    title: "Mop floor",
    detail: "Gum scraped off floor, floor mopped in direction of tile if applicable, water dumped outside at completion.",
  },
  {
    id: "office",
    title: "Leave Properly",
    detail: "Office organized, music on, TVs left on store information slides, and door auto-lock confirmed.",
  },
];

const state = {
  items: checklistItems.map((item) => ({ ...item, done: false, photo: "" })),
  toastTimer: null,
};

const checklist = document.getElementById("checklist");
const locationSelect = document.getElementById("locationSelect");
const employeeInput = document.getElementById("employeeInput");
const notesInput = document.getElementById("notesInput");
const progressText = document.getElementById("progressText");
const photoText = document.getElementById("photoText");
const progressBar = document.getElementById("progressBar");
const submitButton = document.getElementById("submitButton");
const resetButton = document.getElementById("resetButton");
const reviewButton = document.getElementById("reviewButton");
const summaryDialog = document.getElementById("summaryDialog");
const closeDialog = document.getElementById("closeDialog");
const submissionList = document.getElementById("submissionList");
const standardsSummary = document.getElementById("standardsSummary");
const toast = document.getElementById("toast");
const DASHBOARD_WINDOW_DAYS = 14;
const PHOTO_RETENTION_DAYS = 14;
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwu_8JdvWRTPtKaT_8wcXj2F_53LrsfimY9g41QPuMgcV9-SfrhKBFJCF8uvsFPR8ES/exec";

function getSubmissions() {
  try {
    return JSON.parse(localStorage.getItem("laundrySubmissions") || "[]");
  } catch {
    return [];
  }
}

function saveSubmissions(submissions) {
  localStorage.setItem("laundrySubmissions", JSON.stringify(submissions.slice(0, 60)));
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  toast.textContent = message;
  toast.classList.add("visible");
  state.toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
}

function itemIsComplete(item) {
  return item.done && (!item.photoRequired || Boolean(item.photo));
}

function renderChecklist() {
  checklist.innerHTML = state.items
    .map((item) => {
      const complete = itemIsComplete(item);
      const photoLabel = item.photo ? "Photo added" : "Photo required";
      return `
        <article class="check-item ${complete ? "done" : ""}" data-id="${item.id}">
          <div class="check-main">
            <button class="task-toggle" type="button" aria-label="Mark ${item.title} complete">
              <span aria-hidden="true">✓</span>
            </button>
            <div>
              <p class="task-title">${item.title}</p>
              <p class="task-detail">${item.detail}</p>
              <div class="task-meta">
                <span class="pill location">${locationSelect.value}</span>
                ${
                  item.photoRequired
                    ? `<span class="pill ${item.photo ? "complete" : "required"}">${photoLabel}</span>`
                    : ""
                }
              </div>
            </div>
            ${
              item.photoRequired
                ? `<button class="expand-button" type="button" aria-label="Add photo for ${item.title}">+</button>`
                : ""
            }
          </div>
          ${
            item.photoRequired
              ? `
                <div class="photo-panel">
                  <input class="photo-input" id="photo-${item.id}" type="file" accept="image/*" capture="environment" />
                  <label class="photo-button" for="photo-${item.id}">Take or upload photo</label>
                  <img class="photo-preview ${item.photo ? "visible" : ""}" src="${item.photo}" alt="${item.title} proof" />
                </div>
              `
              : ""
          }
        </article>
      `;
    })
    .join("");

  updateProgress();
}

function updateProgress() {
  const completeCount = state.items.filter(itemIsComplete).length;
  const photoRemaining = state.items.filter((item) => item.photoRequired && !item.photo).length;
  progressText.textContent = `${completeCount} of ${state.items.length} complete`;
  photoText.textContent = `${photoRemaining} photo item${photoRemaining === 1 ? "" : "s"} left`;
  progressBar.style.width = `${Math.round((completeCount / state.items.length) * 100)}%`;
  submitButton.disabled = employeeInput.value.trim().length < 2;
}

function compressPhoto(file, maxSize = 1200, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read photo."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Could not load photo."));
      image.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", quality),
          originalName: file.name || "checklist-photo.jpg",
        });
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function readPhoto(file, itemId) {
  try {
    const photo = await compressPhoto(file);
    const item = state.items.find((entry) => entry.id === itemId);
    item.photo = photo.dataUrl;
    item.photoName = photo.originalName;
    item.done = true;
    renderChecklist();
    document.querySelector(`[data-id="${itemId}"]`)?.classList.add("open");
    showToast("Photo saved.");
  } catch {
    showToast("Photo could not be saved. Try taking it again.");
  }
}

function resetForm() {
  state.items = checklistItems.map((item) => ({ ...item, done: false, photo: "" }));
  notesInput.value = "";
  renderChecklist();
  showToast("Checklist reset.");
}

async function sendSubmissionToBackend(payload) {
  if (!BACKEND_URL) return;

  await fetch(BACKEND_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
}

async function submitChecklist() {
  updateProgress();
  if (submitButton.disabled) {
    showToast("Enter the employee name before submitting.");
    return;
  }

  const submissions = getSubmissions();
  const completedAt = new Date();
  const itemRecords = state.items.map((item) => ({
    id: item.id,
    title: item.title,
    done: item.done,
    photoRequired: Boolean(item.photoRequired),
    hasPhoto: Boolean(item.photo),
  }));
  const completeCount = itemRecords.filter((item) => item.done).length;
  const missingPhotos = itemRecords.filter((item) => item.photoRequired && !item.hasPhoto);
  const completionRate = Math.round((completeCount / itemRecords.length) * 100);
  const proofPhotos = state.items
    .filter((item) => item.photoRequired && item.photo)
    .map((item) => ({
      itemId: item.id,
      title: item.title,
      fileName: item.photoName || `${item.id}.jpg`,
      dataUrl: item.photo,
    }));

  const submission = {
    id: completedAt.toISOString(),
    dateKey: completedAt.toISOString().slice(0, 10),
    completedAt: completedAt.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }),
    location: locationSelect.value,
    employee: employeeInput.value.trim(),
    notes: notesInput.value.trim(),
    itemCount: itemRecords.length,
    completeCount,
    completionRate,
    photoCount: itemRecords.filter((item) => item.photoRequired && item.hasPhoto).length,
    missingPhotoCount: missingPhotos.length,
    missingPhotos: missingPhotos.map((item) => item.title),
    missedTasks: itemRecords.filter((item) => !item.done).map((item) => item.title),
    items: itemRecords,
    proofPhotos,
  };

  try {
    await sendSubmissionToBackend(submission);
  } catch {
    showToast("Saved on this device. Backend upload did not complete.");
  }

  submissions.unshift({ ...submission, proofPhotos: [] });
  saveSubmissions(submissions);
  showToast(completionRate >= 80 && !missingPhotos.length ? "Checklist submitted and meets standard." : "Checklist submitted with accountability flags.");
  resetForm();
}

function groupByEmployee(submissions) {
  return submissions.reduce((groups, submission) => {
    const key = submission.employee.toLowerCase();
    groups[key] ||= {
      name: submission.employee,
      total: 0,
      under80: 0,
      missingPhotos: 0,
      taskMisses: {},
    };

    const group = groups[key];
    const rate = submission.completionRate ?? Math.round(((submission.completeCount ?? submission.itemCount) / submission.itemCount) * 100);
    group.total += 1;
    if (rate < 80) group.under80 += 1;
    if ((submission.missingPhotoCount ?? 0) > 0) group.missingPhotos += 1;
    (submission.missedTasks || []).forEach((task) => {
      group.taskMisses[task] = (group.taskMisses[task] || 0) + 1;
    });

    return groups;
  }, {});
}

function getSubmissionRate(submission) {
  return submission.completionRate ?? Math.round(((submission.completeCount ?? submission.itemCount) / submission.itemCount) * 100);
}

function isFlaggedSubmission(submission) {
  return getSubmissionRate(submission) < 80 || (submission.missingPhotoCount ?? 0) > 0 || (submission.missedTasks || []).length > 0;
}

function getRecentSubmissions(submissions, days = DASHBOARD_WINDOW_DAYS) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return submissions.filter((submission) => {
    const created = Date.parse(submission.id || submission.dateKey || "");
    return Number.isNaN(created) || created >= cutoff;
  });
}

function getTodaySubmissions(submissions) {
  const today = new Date().toISOString().slice(0, 10);
  return submissions.filter((submission) => submission.dateKey === today);
}

function countTaskMisses(submissions) {
  return submissions
    .flatMap((submission) => submission.missedTasks || [])
    .reduce((counts, task) => {
      counts[task] = (counts[task] || 0) + 1;
      return counts;
    }, {});
}

function countStoreFlags(submissions) {
  return submissions.reduce((counts, submission) => {
    if (isFlaggedSubmission(submission)) {
      counts[submission.location] = (counts[submission.location] || 0) + 1;
    }
    return counts;
  }, {});
}

function renderMetric(value, label) {
  return `
    <div class="metric-card">
      <strong>${value}</strong>
      <span>${label}</span>
    </div>
  `;
}

function renderList(items, emptyText) {
  if (!items.length) {
    return `<ul><li><strong>${emptyText}</strong></li></ul>`;
  }

  return `
    <ul>
      ${items.map(([label, value]) => `<li><strong>${label}</strong><span>${value}</span></li>`).join("")}
    </ul>
  `;
}

function getConsistentMisses(group) {
  return Object.entries(group.taskMisses)
    .filter(([, count]) => count >= 2 || count / group.total >= 0.5)
    .sort((a, b) => b[1] - a[1]);
}

function renderStandardsSummary(submissions) {
  if (!submissions.length) {
    standardsSummary.innerHTML = `
      <div class="dashboard-grid">
        ${renderMetric("0", "submissions yet")}
        ${renderMetric("0", "photo issues")}
        ${renderMetric("0%", "average completion")}
      </div>
      <div class="standard-card">
        <strong>Backend plan</strong>
        <p>Use Google Sheets for lightweight checklist records and Google Drive only for short-lived proof photos. Photos should auto-delete after ${PHOTO_RETENTION_DAYS} days, while Sheets keeps the useful accountability history.</p>
      </div>
    `;
    return;
  }

  const recent = getRecentSubmissions(submissions);
  const today = getTodaySubmissions(submissions);
  const averageRate = Math.round(recent.reduce((sum, submission) => sum + getSubmissionRate(submission), 0) / recent.length);
  const missingPhotoTotal = recent.reduce((sum, submission) => sum + (submission.missingPhotoCount || 0), 0);
  const flaggedTotal = recent.filter(isFlaggedSubmission).length;
  const noteItems = recent
    .filter((submission) => submission.notes)
    .slice(0, 5)
    .map((submission) => [submission.location, `${submission.employee}: ${submission.notes}`]);
  const taskMisses = Object.entries(countTaskMisses(recent))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([task, count]) => [task, `${count} miss${count === 1 ? "" : "es"}`]);
  const storeFlags = Object.entries(countStoreFlags(recent))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([store, count]) => [store, `${count} flagged checklist${count === 1 ? "" : "s"}`]);

  const flagged = Object.values(groupByEmployee(submissions))
    .map((group) => ({ ...group, consistentMisses: getConsistentMisses(group) }))
    .filter((group) => group.under80 || group.missingPhotos || group.consistentMisses.length);

  const flagMarkup = flagged.length
    ? flagged
        .map((group) => {
          const reasons = [
            group.under80 ? `${group.under80} checklist${group.under80 === 1 ? "" : "s"} under 80%` : "",
            group.missingPhotos ? `${group.missingPhotos} missing photo issue${group.missingPhotos === 1 ? "" : "s"}` : "",
            group.consistentMisses.length
              ? `Repeated miss: ${group.consistentMisses.map(([task]) => task).join(", ")}`
              : "",
          ].filter(Boolean);
          return `<li><strong>${group.name}</strong><span>${reasons.join(" · ")}</span></li>`;
        })
        .join("")
    : `<li><strong>No accountability flags</strong><span>Recent submissions meet the 80% completion and photo standards.</span></li>`;

  standardsSummary.innerHTML = `
    <div class="dashboard-grid">
      ${renderMetric(today.length, "submitted today")}
      ${renderMetric(`${averageRate}%`, `${DASHBOARD_WINDOW_DAYS}-day average`)}
      ${renderMetric(flaggedTotal, "flagged checklists")}
      ${renderMetric(missingPhotoTotal, "missing photos")}
    </div>
    <div class="standard-card">
      <strong>Standards watch list</strong>
      <ul>${flagMarkup}</ul>
    </div>
    <div class="standard-card">
      <strong>Most missed tasks</strong>
      ${renderList(taskMisses, "No repeated task misses yet")}
    </div>
    <div class="standard-card">
      <strong>Stores needing attention</strong>
      ${renderList(storeFlags, "No store-level flags yet")}
    </div>
    <div class="standard-card">
      <strong>Supplies, keys, and tools</strong>
      ${renderList(noteItems, "No supply or tool notes yet")}
    </div>
    <div class="standard-card">
      <strong>Nightly Homebase audit</strong>
      <p>At 10 PM, compare tonight's scheduled employees against checklist submissions. Flag anyone with no checklist, under 80% completion, missing Soap dishes or Empty lint traps photos, or repeated missed tasks.</p>
    </div>
    <div class="standard-card">
      <strong>Recommended backend</strong>
      <p>Google Sheets should store one row per checklist plus task/photo status columns. Google Drive should store only compressed proof photos in dated folders, with an automatic ${PHOTO_RETENTION_DAYS}-day deletion job. The manager dashboard should read from Sheets, not scan Drive.</p>
    </div>
  `;
}

function renderSubmissions() {
  const submissions = getSubmissions();
  renderStandardsSummary(submissions);

  if (!submissions.length) {
    submissionList.innerHTML = `<div class="submission"><strong>No submissions yet</strong><span>Completed checklists will appear here.</span></div>`;
    return;
  }

  submissionList.innerHTML = submissions
        .map(
      (submission) => `
        <article class="submission">
          <strong>${submission.location}</strong>
          <span>${submission.employee} · ${submission.completedAt}</span>
          <span>${submission.completeCount ?? submission.itemCount}/${submission.itemCount} tasks · ${submission.completionRate ?? 100}% complete · ${submission.photoCount} required photos</span>
          ${submission.missingPhotoCount ? `<span class="alert-line">Missing photos: ${submission.missingPhotos.join(", ")}</span>` : ""}
          ${submission.missedTasks?.length ? `<span class="alert-line">Missed tasks: ${submission.missedTasks.join(", ")}</span>` : ""}
          ${submission.notes ? `<p>${submission.notes}</p>` : ""}
        </article>
      `,
    )
    .join("");
}

checklist.addEventListener("click", (event) => {
  const card = event.target.closest(".check-item");
  if (!card) return;
  const item = state.items.find((entry) => entry.id === card.dataset.id);

  if (event.target.closest(".task-toggle")) {
    if (item.photoRequired && !item.photo) {
      card.classList.add("open");
      showToast("Add the required photo to complete this item.");
      return;
    }
    item.done = !item.done;
    renderChecklist();
  }

  if (event.target.closest(".expand-button")) {
    card.classList.toggle("open");
  }
});

checklist.addEventListener("change", (event) => {
  const input = event.target.closest(".photo-input");
  if (!input || !input.files?.[0]) return;
  const card = input.closest(".check-item");
  readPhoto(input.files[0], card.dataset.id);
});

locationSelect.addEventListener("change", renderChecklist);
employeeInput.addEventListener("input", updateProgress);
submitButton.addEventListener("click", submitChecklist);
resetButton.addEventListener("click", resetForm);
reviewButton.addEventListener("click", () => {
  renderSubmissions();
  summaryDialog.showModal();
});
closeDialog.addEventListener("click", () => summaryDialog.close());

renderChecklist();
