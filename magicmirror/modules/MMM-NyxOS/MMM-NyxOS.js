/* MMM-NyxOS — renders one region of the shared NyxOS/Mr Sprinkles payload.
 * Which region a given instance draws is set by config.region; see
 * config/config.js for the full set of instances (one per screen area).
 */
Module.register("MMM-NyxOS", {
  defaults: {
    region: "events", // departure | events | meals | tasks | coins | checklist | chores
    updateInterval: 60 * 1000,
    fadeSpeed: 500,
  },

  start: function () {
    this.payload = null;
    this.errorMessage = null;
    this.loaded = false;
    this.getData();
    setInterval(() => this.getData(), this.config.updateInterval);
  },

  getData: function () {
    this.sendSocketNotification("NYXOS_GET_DATA");
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "NYXOS_DATA") {
      this.payload = payload;
      this.errorMessage = null;
      this.loaded = true;
      this.updateDom(this.config.fadeSpeed);
    } else if (notification === "NYXOS_ERROR") {
      this.errorMessage = payload.message;
      this.updateDom(this.config.fadeSpeed);
    }
  },

  getStyles: function () {
    return ["MMM-NyxOS.css"];
  },

  getDom: function () {
    const wrapper = document.createElement("div");
    wrapper.className = `nyxos nyxos-${this.config.region}`;

    if (!this.loaded) {
      wrapper.innerHTML = `<div class="nyxos-loading">Loading…</div>`;
      return wrapper;
    }
    if (this.errorMessage) {
      wrapper.innerHTML = `<div class="nyxos-error">NyxOS unavailable</div>`;
      return wrapper;
    }

    const renderers = {
      departure: () => this.renderDeparture(),
      events: () => this.renderEvents(),
      meals: () => this.renderMeals(),
      tasks: () => this.renderTasks(),
      coins: () => this.renderCoins(),
      checklist: () => this.renderChecklist(),
      chores: () => this.renderChores(),
    };
    const render = renderers[this.config.region];
    wrapper.appendChild(render ? render() : this.comingSoon("Unknown region"));
    return wrapper;
  },

  comingSoon: function (label) {
    const el = document.createElement("div");
    el.className = "nyxos-coming-soon";
    el.textContent = label || "Coming soon";
    return el;
  },

  title: function (text) {
    const h = document.createElement("div");
    h.className = "nyxos-title";
    h.textContent = text;
    return h;
  },

  // ── departure (top_bar) ──────────────────────────────────────
  renderDeparture: function () {
    const el = document.createElement("div");
    const d = this.payload.departure;
    if (!d || !d.available) {
      el.appendChild(this.comingSoon("Departure: coming soon"));
      return el;
    }
    if (!d.label) {
      el.className = "nyxos-departure-empty";
      el.textContent = "No departure rule configured";
      return el;
    }
    if (d.todayOff) {
      el.className = "nyxos-departure";
      el.textContent = `No ${d.label} today`;
      return el;
    }
    if (d.minutes_until === null) {
      el.className = "nyxos-departure";
      el.textContent = `${d.label} at ${d.time}`;
      return el;
    }
    el.className = "nyxos-departure";
    if (d.minutes_until < 0) {
      el.textContent = `${d.label} departure has passed`;
    } else {
      el.textContent = `Leave in ${d.minutes_until} min for ${d.label}`;
    }
    return el;
  },

  // ── this week's events (top_left) ───────────────────────────
  renderEvents: function () {
    const wrap = document.createElement("div");
    wrap.appendChild(this.title("This Week"));
    const e = this.payload.events;
    if (!e || !e.available) {
      wrap.appendChild(this.comingSoon("Calendar: coming soon"));
      return wrap;
    }
    if (!e.items.length) {
      wrap.appendChild(this.emptyLine("Nothing scheduled"));
      return wrap;
    }
    const byDay = {};
    e.items.forEach((ev) => {
      const d = ev.start ? new Date(ev.start) : null;
      const key = d ? d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" }) : "TBD";
      (byDay[key] = byDay[key] || []).push(ev);
    });
    const list = document.createElement("div");
    list.className = "nyxos-list";
    Object.entries(byDay).forEach(([day, evs]) => {
      const dayHeader = document.createElement("div");
      dayHeader.className = "nyxos-day-header";
      dayHeader.textContent = day;
      list.appendChild(dayHeader);
      evs.forEach((ev) => {
        const row = document.createElement("div");
        row.className = "nyxos-row";
        const time = ev.start ? new Date(ev.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
        row.innerHTML = `<span class="nyxos-row-title">${ev.title}</span><span class="nyxos-row-meta">${time}${ev.location ? " · " + ev.location : ""}</span>`;
        list.appendChild(row);
      });
    });
    wrap.appendChild(list);
    return wrap;
  },

  // ── today's meals (middle_left) ─────────────────────────────
  renderMeals: function () {
    const wrap = document.createElement("div");
    wrap.appendChild(this.title("Today's Meals"));
    const m = this.payload.meals;
    const list = document.createElement("div");
    list.className = "nyxos-list";
    [
      ["Lunch", m.lunch],
      ["Dinner", m.dinner],
    ].forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "nyxos-row";
      row.innerHTML = `<span class="nyxos-row-label">${label}</span><span class="nyxos-row-value">${value || "Not planned"}</span>`;
      list.appendChild(row);
    });
    wrap.appendChild(list);
    return wrap;
  },

  // ── open tasks (middle_center) ──────────────────────────────
  renderTasks: function () {
    const wrap = document.createElement("div");
    wrap.appendChild(this.title("Open Tasks"));
    const t = this.payload.tasks;
    if (!t || !t.available) {
      wrap.appendChild(this.comingSoon("Tasks: coming soon"));
      return wrap;
    }
    if (!t.items.length) {
      wrap.appendChild(this.emptyLine("Nothing open"));
      return wrap;
    }
    const list = document.createElement("div");
    list.className = "nyxos-list";
    t.items.forEach((task) => {
      const row = document.createElement("div");
      row.className = "nyxos-row";
      const due = task.due_date ? new Date(task.due_date).toLocaleDateString("en-US", { month: "numeric", day: "numeric" }) : "";
      row.innerHTML = `<span class="nyxos-row-title">${task.title}</span><span class="nyxos-row-meta">${task.domain || ""}${due ? " · " + due : ""}</span>`;
      list.appendChild(row);
    });
    wrap.appendChild(list);
    return wrap;
  },

  // ── kids coins (middle_right) ───────────────────────────────
  renderCoins: function () {
    const wrap = document.createElement("div");
    wrap.appendChild(this.title("Coins"));
    const coins = this.payload.coins || [];
    if (!coins.length) {
      wrap.appendChild(this.emptyLine("No kids set up yet"));
      return wrap;
    }
    const list = document.createElement("div");
    list.className = "nyxos-coins-list";
    coins.forEach((c) => {
      const row = document.createElement("div");
      row.className = "nyxos-coin-row";
      row.innerHTML = `<span class="nyxos-coin-name">${c.kid}</span><span class="nyxos-coin-total">${c.coins}</span>`;
      list.appendChild(row);
    });
    wrap.appendChild(list);
    return wrap;
  },

  // ── kids checklist (bottom_left) ────────────────────────────
  // One column per kid so a long combined list doesn't grow taller than
  // the region and spill into the module above (e.g. the clock).
  renderChecklist: function () {
    const wrap = document.createElement("div");
    wrap.appendChild(this.title("Checklist"));
    const items = this.payload.checklist || [];
    if (!items.length) {
      wrap.appendChild(this.emptyLine("Nothing scheduled today"));
      return wrap;
    }

    const byKid = {};
    items.forEach((i) => {
      (byKid[i.kid] = byKid[i.kid] || []).push(i);
    });

    const columns = document.createElement("div");
    columns.className = "nyxos-columns";
    Object.entries(byKid).forEach(([kid, kidItems]) => {
      const col = document.createElement("div");
      col.className = "nyxos-column";
      const header = document.createElement("div");
      header.className = "nyxos-column-header";
      header.textContent = kid;
      col.appendChild(header);
      const list = document.createElement("div");
      list.className = "nyxos-list nyxos-list-compact";
      kidItems.forEach((i) => {
        const row = document.createElement("div");
        row.className = `nyxos-check-row ${i.done ? "done" : ""}`;
        row.innerHTML = `<span class="nyxos-check-mark">${i.done ? "✓" : "○"}</span><span class="nyxos-row-title">${i.item}</span>`;
        list.appendChild(row);
      });
      col.appendChild(list);
      columns.appendChild(col);
    });
    wrap.appendChild(columns);
    return wrap;
  },

  // ── kids chores (bottom_center) ─────────────────────────────
  renderChores: function () {
    const wrap = document.createElement("div");
    wrap.appendChild(this.title("Today's Chores"));
    const chores = this.payload.chores || [];
    if (!chores.length) {
      wrap.appendChild(this.emptyLine("No chores today"));
      return wrap;
    }
    const list = document.createElement("div");
    list.className = "nyxos-list";
    chores.forEach((c) => {
      const row = document.createElement("div");
      row.className = `nyxos-check-row ${c.done ? "done" : ""}`;
      row.innerHTML = `<span class="nyxos-check-mark">${c.done ? "✓" : "○"}</span><span class="nyxos-row-title">${c.kid}: ${c.chore}</span>`;
      list.appendChild(row);
    });
    wrap.appendChild(list);
    return wrap;
  },

  emptyLine: function (text) {
    const el = document.createElement("div");
    el.className = "nyxos-empty";
    el.textContent = text;
    return el;
  },
});
