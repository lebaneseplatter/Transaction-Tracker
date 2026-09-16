const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

let selectedType = "credit";
let editType = "credit";
let editId = null;
let transactions = [];

const btnCredit = document.getElementById("btnCredit");
const btnDebit = document.getElementById("btnDebit");
const amountInput = document.getElementById("amount");
const noteInput = document.getElementById("note");
const errorMsg = document.getElementById("errorMsg");
const submitBtn = document.getElementById("submitBtn");
const historyList = document.getElementById("historyList");
const filterType = document.getElementById("filterType");
const filterDate = document.getElementById("filterDate");
const exportBtn = document.getElementById("exportBtn");

const editModal = document.getElementById("editModal");
const editBtnCredit = document.getElementById("editBtnCredit");
const editBtnDebit = document.getElementById("editBtnDebit");
const editAmount = document.getElementById("editAmount");
const editNote = document.getElementById("editNote");
const editErrorMsg = document.getElementById("editErrorMsg");
const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

btnCredit.addEventListener("click", () => {
  selectedType = "credit";
  btnCredit.classList.add("selected");
  btnDebit.classList.remove("selected");
});
btnDebit.addEventListener("click", () => {
  selectedType = "debit";
  btnDebit.classList.add("selected");
  btnCredit.classList.remove("selected");
});

editBtnCredit.addEventListener("click", () => {
  editType = "credit";
  editBtnCredit.classList.add("selected");
  editBtnDebit.classList.remove("selected");
});
editBtnDebit.addEventListener("click", () => {
  editType = "debit";
  editBtnDebit.classList.add("selected");
  editBtnCredit.classList.remove("selected");
});

const tabOrder = ["add", "history"];
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const current = document
      .querySelector(".panel.active")
      .id.replace("panel-", "");
    const target = tab.dataset.tab;
    if (current === target) return;

    const dir =
      tabOrder.indexOf(target) > tabOrder.indexOf(current) ? "right" : "left";

    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    const currentPanel = document.getElementById("panel-" + current);
    const targetPanel = document.getElementById("panel-" + target);

    currentPanel.classList.remove("active");
    currentPanel.classList.add(
      dir === "right" ? "leaving-left" : "leaving-right",
    );

    setTimeout(() => {
      currentPanel.classList.remove("leaving-left", "leaving-right");
      targetPanel.classList.add(
        "active",
        dir === "right" ? "entering-right" : "entering-left",
      );
      setTimeout(() => {
        targetPanel.classList.remove("entering-left", "entering-right");
      }, 320);
    }, 220);
  });
});

async function loadTransactions() {
  const { data, error } = await supabaseClient
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load transactions", error);
    transactions = [];
  } else {
    transactions = data.map((row) => ({
      id: row.id,
      type: row.type,
      amount: Number(row.amount),
      note: row.note || "",
      timestamp: new Date(row.created_at).getTime(),
    }));
  }
  render();
}

function formatMoney(n) {
  return (
    "₹" +
    n.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatDay(date) {
  const today = new Date();
  const d = new Date(date);
  const isToday = d.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getFilteredTransactions() {
  let list = [...transactions];
  const type = filterType.value;
  const dateRange = filterDate.value;

  if (type !== "all") {
    list = list.filter((t) => t.type === type);
  }

  if (dateRange !== "all") {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    let cutoff;
    if (dateRange === "today") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      cutoff = startOfDay.getTime();
    } else if (dateRange === "week") {
      cutoff = now - 7 * dayMs;
    } else if (dateRange === "month") {
      cutoff = now - 30 * dayMs;
    }
    list = list.filter((t) => t.timestamp >= cutoff);
  }

  return list.sort((a, b) => b.timestamp - a.timestamp);
}

function render() {
  let credit = 0,
    debit = 0;
  transactions.forEach((t) => {
    if (t.type === "credit") credit += t.amount;
    else debit += t.amount;
  });
  const balance = credit - debit;
  document.getElementById("balance").textContent = formatMoney(balance);
  document.getElementById("totalCredit").textContent = formatMoney(credit);
  document.getElementById("totalDebit").textContent = formatMoney(debit);

  const filtered = getFilteredTransactions();

  if (transactions.length === 0) {
    historyList.innerHTML =
      '<div class="empty-state">No transactions yet. Add your first one from the Add entry tab.</div>';
    return;
  }
  if (filtered.length === 0) {
    historyList.innerHTML =
      '<div class="empty-state">No transactions match these filters.</div>';
    return;
  }

  let html = "";
  let lastDay = null;
  filtered.forEach((t) => {
    const day = formatDay(t.timestamp);
    if (day !== lastDay) {
      html += `<div class="history-day">${day}</div>`;
      lastDay = day;
    }
    const sign = t.type === "credit" ? "+" : "-";
    const icon = t.type === "credit" ? "↓" : "↑";
    html += `
      <div class="txn-item ${t.type}">
        <div class="txn-icon">${icon}</div>
        <div class="txn-info">
          <div class="txn-note">${t.note || (t.type === "credit" ? "Credit" : "Debit")}</div>
          <div class="txn-time">${formatTime(t.timestamp)}</div>
        </div>
        <div class="txn-amount">${sign}${formatMoney(t.amount)}</div>
        <div class="txn-actions">
          <button class="txn-btn" data-edit="${t.id}" aria-label="Edit transaction">✎</button>
          <button class="txn-btn" data-delete="${t.id}" aria-label="Delete transaction">×</button>
        </div>
      </div>`;
  });
  historyList.innerHTML = html;

  historyList.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.delete);
      const { error } = await supabaseClient
        .from("transactions")
        .delete()
        .eq("id", id);
      if (error) {
        console.error("Failed to delete transaction", error);
        return;
      }
      transactions = transactions.filter((t) => t.id !== id);
      render();
    });
  });

  historyList.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () =>
      openEditModal(Number(btn.dataset.edit)),
    );
  });
}

function openEditModal(id) {
  const txn = transactions.find((t) => t.id === id);
  if (!txn) return;
  editId = id;
  editType = txn.type;
  editAmount.value = txn.amount;
  editNote.value = txn.note || "";
  editErrorMsg.style.display = "none";
  if (editType === "credit") {
    editBtnCredit.classList.add("selected");
    editBtnDebit.classList.remove("selected");
  } else {
    editBtnDebit.classList.add("selected");
    editBtnCredit.classList.remove("selected");
  }
  editModal.classList.add("active");
}

cancelEditBtn.addEventListener("click", () => {
  editModal.classList.remove("active");
  editId = null;
});

saveEditBtn.addEventListener("click", async () => {
  const amount = parseFloat(editAmount.value);
  if (!amount || amount <= 0) {
    editErrorMsg.style.display = "block";
    return;
  }
  editErrorMsg.style.display = "none";
  const roundedAmount = Math.round(amount * 100) / 100;
  const trimmedNote = editNote.value.trim();

  const { error } = await supabaseClient
    .from("transactions")
    .update({ type: editType, amount: roundedAmount, note: trimmedNote })
    .eq("id", editId);

  if (error) {
    console.error("Failed to update transaction", error);
    editErrorMsg.textContent = "Could not save changes, try again";
    editErrorMsg.style.display = "block";
    return;
  }

  const txn = transactions.find((t) => t.id === editId);
  if (txn) {
    txn.type = editType;
    txn.amount = roundedAmount;
    txn.note = trimmedNote;
    render();
  }
  editModal.classList.remove("active");
  editId = null;
});

filterType.addEventListener("change", render);
filterDate.addEventListener("change", render);

exportBtn.addEventListener("click", () => {
  const list = getFilteredTransactions();
  if (list.length === 0) return;
  let csv = "Date,Time,Type,Amount,Note\n";
  list.forEach((t) => {
    const d = new Date(t.timestamp);
    const dateStr = d.toLocaleDateString("en-IN");
    const timeStr = formatTime(t.timestamp);
    const note = (t.note || "").replace(/"/g, '""');
    csv += `${dateStr},${timeStr},${t.type},${t.amount},"${note}"\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "transactions.csv";
  a.click();
  URL.revokeObjectURL(url);
});

submitBtn.addEventListener("click", async () => {
  const amount = parseFloat(amountInput.value);
  if (!amount || amount <= 0) {
    errorMsg.style.display = "block";
    return;
  }
  errorMsg.style.display = "none";

  const roundedAmount = Math.round(amount * 100) / 100;
  const note = noteInput.value.trim();

  submitBtn.disabled = true;
  const { data, error } = await supabaseClient
    .from("transactions")
    .insert([{ type: selectedType, amount: roundedAmount, note }])
    .select();
  submitBtn.disabled = false;

  if (error) {
    console.error("Failed to add transaction", error);
    errorMsg.textContent = "Could not save, check your connection";
    errorMsg.style.display = "block";
    return;
  }

  const row = data[0];
  transactions.push({
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    note: row.note || "",
    timestamp: new Date(row.created_at).getTime(),
  });
  amountInput.value = "";
  noteInput.value = "";
  render();

  document.querySelector('.tab[data-tab="history"]').click();
});

amountInput.addEventListener("input", () => {
  errorMsg.style.display = "none";
});

const loginOverlay = document.getElementById("loginOverlay");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const appRoot = document.getElementById("appRoot");

function showApp() {
  loginOverlay.classList.remove("active");
  appRoot.style.display = "block";
  loadTransactions();
}

function showLogin() {
  loginOverlay.classList.add("active");
  appRoot.style.display = "none";
}

async function ensureSession() {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  if (session) {
    showApp();
  } else {
    showLogin();
  }
}

loginBtn.addEventListener("click", async () => {
  loginError.style.display = "none";
  loginBtn.disabled = true;
  const { error } = await supabaseClient.auth.signInWithPassword({
    email: loginEmail.value.trim(),
    password: loginPassword.value,
  });
  loginBtn.disabled = false;
  if (error) {
    loginError.textContent = "Incorrect email or password";
    loginError.style.display = "block";
    return;
  }
  loginPassword.value = "";
  showApp();
});

const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  transactions = [];
  loginEmail.value = "";
  loginPassword.value = "";
  showLogin();
});

loginPassword.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

ensureSession();
