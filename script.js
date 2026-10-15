(() => {
  const storageKey = "spend-well-expenses";
  const form = document.querySelector("#expense-form");
  const list = document.querySelector("#transaction-list");
  const categoryFilter = document.querySelector("#category-filter");
  const expenseAmount = document.querySelectorAll(".dashboard-grid .amount")[1];
  const datePicker = document.querySelector(".date-picker");
  const exportButton = document.querySelector(".export-btn");
  const categories = ["Housing", "Food", "Travel", "Utilities"];
  const categoryIcons = {
    Housing: "fa-house",
    Food: "fa-utensils",
    Travel: "fa-car",
    Utilities: "fa-bolt",
    Entertainment: "fa-film",
    Health: "fa-heart-pulse",
  };

  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  function loadExpenses() {
    try {
      const savedExpenses = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(savedExpenses) ? savedExpenses : [];
    } catch {
      return [];
    }
  }

  let expenses = loadExpenses();

  function saveExpenses() {
    localStorage.setItem(storageKey, JSON.stringify(expenses));
  }

  function getLocalDateString() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${today.getFullYear()}-${month}-${day}`;
  }

  function formatDate(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(year, month - 1, day));
  }

  function getCurrentMonthExpenses() {
    const currentMonth = getLocalDateString().slice(0, 7);
    return expenses.filter((expense) => expense.date.startsWith(currentMonth));
  }

  function renderTransactions() {
    const selectedCategory = categoryFilter.value;
    const visibleExpenses = expenses
      .filter((expense) => selectedCategory === "all" || expense.category === selectedCategory)
      .sort((first, second) => second.date.localeCompare(first.date));

    list.replaceChildren();

    if (visibleExpenses.length === 0) {
      const emptyState = document.createElement("li");
      emptyState.className = "empty-state";
      emptyState.textContent = selectedCategory === "all"
        ? "No expenses yet. Add one to get started."
        : `No ${selectedCategory.toLowerCase()} expenses found.`;
      list.append(emptyState);
      return;
    }

    visibleExpenses.forEach((expense) => {
      const item = document.createElement("li");
      item.className = "transaction-item";

      const meta = document.createElement("div");
      meta.className = "transaction-meta";

      const icon = document.createElement("span");
      icon.className = "transaction-icon";
      icon.setAttribute("aria-hidden", "true");
      const iconElement = document.createElement("i");
      iconElement.className = `fas ${categoryIcons[expense.category] || "fa-receipt"}`;
      icon.append(iconElement);

      const details = document.createElement("div");
      const name = document.createElement("div");
      name.className = "transaction-name";
      name.textContent = expense.name;
      const sub = document.createElement("div");
      sub.className = "transaction-sub";
      sub.textContent = `${expense.category} · ${formatDate(expense.date)}`;
      details.append(name, sub);
      meta.append(icon, details);

      const actions = document.createElement("div");
      actions.className = "transaction-actions";
      const amount = document.createElement("span");
      amount.className = "transaction-amount";
      amount.textContent = `-${currency.format(expense.amount)}`;

      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-btn";
      deleteButton.type = "button";
      deleteButton.title = `Delete ${expense.name}`;
      deleteButton.setAttribute("aria-label", `Delete ${expense.name}`);
      deleteButton.innerHTML = '<i class="fas fa-trash" aria-hidden="true"></i>';
      deleteButton.addEventListener("click", () => {
        expenses = expenses.filter((entry) => entry.id !== expense.id);
        saveExpenses();
        render();
      });

      actions.append(amount, deleteButton);
      item.append(meta, actions);
      list.append(item);
    });
  }

  function renderSummary() {
    const monthExpenses = getCurrentMonthExpenses();
    const total = monthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    expenseAmount.textContent = currency.format(total);

    const amountsByCategory = Object.fromEntries(categories.map((category) => [category, 0]));
    monthExpenses.forEach((expense) => {
      if (Object.hasOwn(amountsByCategory, expense.category)) {
        amountsByCategory[expense.category] += Number(expense.amount);
      }
    });

    const largestCategoryTotal = Math.max(...Object.values(amountsByCategory));
    categories.forEach((category, index) => {
      const fill = document.querySelector(`.fill-${index + 1}`);
      const amount = amountsByCategory[category];
      fill.style.width = largestCategoryTotal === 0
        ? "0%"
        : `${Math.max(4, (amount / largestCategoryTotal) * 100)}%`;
      fill.title = `${category}: ${currency.format(amount)}`;
    });

    const spendingUsed = document.querySelector(".spending-used");
    const progressFill = document.querySelector(".progress-fill");
    const spendingTotal = 15000;
    spendingUsed.textContent = `used from ${currency.format(spendingTotal)}`;
    progressFill.style.width = `${Math.min((total / spendingTotal) * 100, 100)}%`;
    progressFill.setAttribute("aria-label", `${Math.round((total / spendingTotal) * 100)}% of spending limit used`);
  }

  function updateDate() {
    const today = new Date();
    const dateText = document.createTextNode(` ${new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(today)}`);
    datePicker.replaceChildren(datePicker.querySelector("i"), dateText);
  }

  function render() {
    renderTransactions();
    renderSummary();
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const amount = Number(formData.get("amount"));
    const name = formData.get("name").trim();

    if (!name) {
      form.elements.name.focus();
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      form.elements.amount.focus();
      return;
    }

    expenses.push({
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      name,
      category: formData.get("category"),
      amount,
      date: formData.get("date"),
    });
    saveExpenses();
    form.reset();
    form.elements.date.value = getLocalDateString();
    render();
  });

  categoryFilter.addEventListener("change", renderTransactions);

  exportButton.addEventListener("click", () => {
    const rows = [
      ["Name", "Category", "Amount", "Date"],
      ...expenses.map((expense) => [expense.name, expense.category, expense.amount, expense.date]),
    ];
    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const downloadUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const downloadLink = document.createElement("a");
    downloadLink.href = downloadUrl;
    downloadLink.download = "spend-well-expenses.csv";
    downloadLink.click();
    URL.revokeObjectURL(downloadUrl);
  });

  form.elements.date.value = getLocalDateString();
  updateDate();
  render();
})();