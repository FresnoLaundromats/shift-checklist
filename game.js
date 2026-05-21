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
const successMessage = document.getElementById("successMessage");
const submitButton = document.getElementById("submitButton");
const reviewButton = document.getElementById("reviewButton");
const summaryDialog = document.getElementById("summaryDialog");
const closeDialog = document.getElementById("closeDialog");
const thankYouDialog = document.getElementById("thankYouDialog");
const closeThankYou = document.getElementById("closeThankYou");
const thankYouFallback = document.getElementById("thankYouFallback");
const closeThankYouFallback = document.getElementById("closeThankYouFallback");
const submissionList = document.getElementById("submissionList");
const standardsSummary = document.getElementById("standardsSummary");
const toast = document.getElementById("toast");
const DASHBOARD_WINDOW_DAYS = 14;
const PHOTO_RETENTION_DAYS = 14;
const BACKEND_URL = "https://script.google.com/macros/s/AKfycbwu_8JdvWRTPtKaT_8wcXj2F_53LrsfimY9g41QPuMgcV9-SfrhKBFJCF8uvsFPR8ES/exec";

function getSubmissions() {
  try {
