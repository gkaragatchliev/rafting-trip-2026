(function () {
  "use strict";

  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  var state = {
    votes: loadVotes(),
    favorite: null,
    available: [],
    myVoteId: null
  };

  // ---------- storage ----------
  function loadVotes() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveVotes() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.votes)); }
    catch (e) { /* storage may be unavailable */ }
  }

  // ---------- url encoding (unicode-safe base64) ----------
  function b64Encode(str) {
    var bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (m, p) {
      return String.fromCharCode("0x" + p);
    });
    return btoa(bytes);
  }
  function b64Decode(b64) {
    var bytes = atob(b64);
    return decodeURIComponent(bytes.split("").map(function (c) {
      return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(""));
  }
  function encodeVotes(arr) { return b64Encode(JSON.stringify(arr)); }
  function decodeVotes(b64) { return JSON.parse(b64Decode(b64)); }

  function normalize(name) { return String(name || "").trim().toLowerCase(); }
  function tripById(id) {
    for (var i = 0; i < TRIPS.length; i++) if (TRIPS[i].id === id) return TRIPS[i];
    return null;
  }
  function dateByKey(key) {
    for (var i = 0; i < DATES.length; i++) if (DATES[i].key === key) return DATES[i];
    return null;
  }

  // ---------- render: trip cards ----------
  function renderTripCards() {
    var wrap = $("#trip-cards");
    if (!wrap) return;
    wrap.innerHTML = TRIPS.map(function (t) {
      return (
        '<div class="trip-card" data-id="' + t.id + '">' +
          '<span class="flag">' + t.flag + '</span>' +
          '<span class="emoji">' + t.emoji + '</span>' +
          '<h3>' + t.name + '</h3>' +
          '<div class="river">' + t.river + '</div>' +
          '<div class="specs">' + t.specs.map(function (s) { return '<span class="spec">' + s + '</span>'; }).join("") + '</div>' +
          '<ul>' + t.highlights.map(function (h) { return '<li>' + h + '</li>'; }).join("") + '</ul>' +
          '<p class="why">' + t.why + '</p>' +
          '<div class="specs">' +
            '<span class="spec">' + t.season + '</span>' +
            '<span class="spec">' + t.price + '</span>' +
            '<span class="spec">' + t.age + '</span>' +
            '<span class="spec">' + t.drive + '</span>' +
          '</div>' +
          stayEatBlock(t) +
          '<div class="check">Click to select as your favorite</div>' +
        '</div>'
      );
    }).join("");
    $$("#trip-cards .trip-card").forEach(function (card) {
      card.addEventListener("click", function (ev) {
        if (ev.target.closest && ev.target.closest(".stay-eat")) return;
        selectFavorite(card.getAttribute("data-id"));
        var voteEl = $("#vote");
        if (voteEl) voteEl.scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  function seCol(title, items) {
    if (!items || !items.length) return "";
    return (
      '<div class="se-col">' +
        '<h4>' + title + '</h4>' +
        '<ul class="se-list">' + items.map(function (it) {
          return '<li><strong>' + escapeHtml(it.name) + '</strong> — ' + escapeHtml(it.info) + '</li>';
        }).join("") + '</ul>' +
      '</div>'
    );
  }

  function stayEatBlock(t) {
    if (!t.stay && !t.eat) return "";
    return (
      '<details class="stay-eat">' +
        '<summary>🏠 Where to stay &amp; eat</summary>' +
        seCol("Stay", t.stay) +
        seCol("Eat", t.eat) +
      '</details>'
    );
  }

  // ---------- render: lodging & restaurants panel ----------
  function renderStayEatPanel() {
    var panel = $("#stay-eat-panel");
    if (!panel) return;
    panel.innerHTML = TRIPS.map(function (t) {
      return (
        '<div class="se-trip">' +
          '<h3>' + t.emoji + " " + t.name + "</h3>" +
          '<div class="se-grid">' +
            seCol("Stay", t.stay) +
            seCol("Eat", t.eat) +
          '</div>' +
        '</div>'
      );
    }).join("");
  }

  // ---------- render: favorite picker ----------
  function renderFavoritePicker() {
    var wrap = $("#favorite-picker");
    if (!wrap) return;
    wrap.innerHTML = TRIPS.map(function (t) {
      return (
        '<div class="fav-opt" data-id="' + t.id + '">' +
          '<div class="fo-emoji">' + t.emoji + '</div>' +
          '<div class="fo-name">' + t.name + '</div>' +
          '<div class="fo-river">' + t.river.split("—")[0].trim() + '</div>' +
        '</div>'
      );
    }).join("");
    $$("#favorite-picker .fav-opt").forEach(function (opt) {
      opt.addEventListener("click", function () { selectFavorite(opt.getAttribute("data-id")); });
    });
    syncFavoriteUI();
  }

  function selectFavorite(id) {
    state.favorite = id;
    syncFavoriteUI();
  }
  function syncFavoriteUI() {
    $$(".fav-opt").forEach(function (opt) {
      opt.classList.toggle("selected", opt.getAttribute("data-id") === state.favorite);
    });
    $$(".trip-card").forEach(function (card) {
      var active = card.getAttribute("data-id") === state.favorite;
      card.classList.toggle("selected", active);
      var check = card.querySelector(".check");
      if (check) check.textContent = active ? "✓ Your favorite" : "Click to select as your favorite";
    });
  }

  // ---------- render: availability picker ----------
  function renderAvailabilityPicker() {
    var wrap = $("#availability-picker");
    if (!wrap) return;
    wrap.innerHTML = DATES.map(function (d) {
      return (
        '<label class="avail-opt" data-key="' + d.key + '">' +
          '<input type="checkbox" value="' + d.key + '" />' +
          '<span>' + d.label + '</span>' +
        '</label>'
      );
    }).join("");
    $$("#availability-picker .avail-opt input").forEach(function (box) {
      box.addEventListener("change", function () {
        var key = box.value;
        if (box.checked) {
          if (state.available.indexOf(key) === -1) state.available.push(key);
        } else {
          state.available = state.available.filter(function (k) { return k !== key; });
        }
        syncAvailabilityUI();
      });
    });
    syncAvailabilityUI();
  }
  function syncAvailabilityUI() {
    $$("#availability-picker .avail-opt").forEach(function (label) {
      var box = label.querySelector("input");
      var selected = state.available.indexOf(box.value) !== -1;
      box.checked = selected;
      label.classList.toggle("selected", selected);
    });
  }

  // ---------- vote form ----------
  function upsertVote(vote) {
    var existing = null;
    for (var i = 0; i < state.votes.length; i++) {
      if (normalize(state.votes[i].name) === normalize(vote.name)) { existing = state.votes[i]; break; }
    }
    if (existing) {
      Object.keys(vote).forEach(function (k) { existing[k] = vote[k]; });
      return existing;
    }
    vote.id = "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    state.votes.push(vote);
    return vote;
  }

  function handleSave(e) {
    e.preventDefault();
    var name = ($("#voter-name") && $("#voter-name").value.trim()) || "";
    var status = $("#save-status");
    if (!name) { setStatus(status, "Please enter your name / household.", "err"); return; }
    if (!state.favorite) { setStatus(status, "Please pick your favorite trip.", "err"); return; }
    if (state.available.length === 0) { setStatus(status, "Please check at least one weekend you're available (or 'Flexible').", "err"); return; }

    var vote = {
      name: name,
      favorite: state.favorite,
      available: state.available.slice(),
      note: ($("#voter-note") && $("#voter-note").value.trim()) || "",
      ts: new Date().toISOString()
    };
    var saved = upsertVote(vote);
    saveVotes();
    state.myVoteId = saved.id;
    setStatus(status, "✓ Vote saved for " + name + "! Use 'Copy my vote link' to share it.", "ok");
    renderResults();
    renderVotesList();
    syncFavoriteUI();
    syncAvailabilityUI();
  }

  function handleClear() {
    var name = ($("#voter-name") && $("#voter-name").value.trim()) || "";
    var status = $("#save-status");
    if (name) {
      state.votes = state.votes.filter(function (v) { return normalize(v.name) !== normalize(name); });
      saveVotes();
      setStatus(status, "Cleared " + name + "'s vote from this device.", "ok");
    } else {
      setStatus(status, "No name entered to clear.", "err");
    }
    renderResults();
    renderVotesList();
  }

  function setStatus(el, msg, kind) {
    if (!el) return;
    el.textContent = msg;
    el.className = "save-status " + (kind || "ok");
    clearTimeout(setStatus._t);
    setStatus._t = setTimeout(function () { el.textContent = ""; el.className = "save-status"; }, 6000);
  }

  // ---------- results ----------
  function renderResults() {
    var bestEl = $("#best-date");
    var people = state.votes;
    if (people.length === 0) {
      bestEl.classList.remove("hidden");
      bestEl.classList.add("empty");
      bestEl.innerHTML = "<h3>No votes yet</h3><p>Once everyone has voted, this box will show the weekend(s) when <strong>everyone</strong> is free and the group favorite.</p>";
      renderTally();
      renderAvailabilityTable();
      return;
    }
    renderBestDate(bestEl);
    renderTally();
    renderAvailabilityTable();
  }

  function renderBestDate(el) {
    var people = state.votes;
    var weekendDates = DATES.filter(function (d) { return d.key !== "flex"; });
    var counts = {};
    weekendDates.forEach(function (d) { counts[d.key] = 0; });
    people.forEach(function (p) {
      (p.available || []).forEach(function (k) { if (counts[k] !== undefined) counts[k]++; });
    });

    var full = [];
    var partial = [];
    weekendDates.forEach(function (d) {
      if (counts[d.key] === people.length) full.push(d.label);
      else if (counts[d.key] > 0) partial.push({ label: d.label, count: counts[d.key] });
    });
    partial.sort(function (a, b) { return b.count - a.count; });

    el.classList.remove("hidden");
    if (full.length > 0) {
      el.classList.remove("empty");
      el.innerHTML =
        "<h3>🎯 Everyone is free these weekends</h3>" +
        "<p><strong>" + full.join(" · ") + "</strong></p>" +
        "<p>Pick the group-favorite trip (see tally) and book the top date before it fills up.</p>";
    } else {
      el.classList.add("empty");
      var top = partial.length ? partial[0] : null;
      el.innerHTML =
        "<h3>😕 No weekend works for everyone yet</h3>" +
        (top
          ? "<p>Closest options: <strong>" + top.label + "</strong> works for " + top.count + " of " + people.length + " households.</p>"
          : "<p>No shared weekend found yet — try adding the 'Flexible (weekdays)' option or new dates.</p>");
    }
  }

  function renderTally() {
    var wrap = $("#favorite-tally");
    if (!wrap) return;
    var counts = {};
    TRIPS.forEach(function (t) { counts[t.id] = 0; });
    state.votes.forEach(function (p) { if (counts[p.favorite] !== undefined) counts[p.favorite]++; });

    var max = 1;
    TRIPS.forEach(function (t) { if (counts[t.id] > max) max = counts[t.id]; });
    var rows = TRIPS.map(function (t) {
      var n = counts[t.id];
      var pct = Math.round((n / max) * 100);
      return (
        '<div class="tally-row">' +
          '<div class="tally-head"><span>' + t.emoji + " " + t.name + "</span><span>" + n + (n === 1 ? " vote" : " votes") + "</span></div>" +
          '<div class="tally-bar"><div class="tally-fill" style="width:' + pct + '%;background:' + t.color + '"></div></div>' +
        '</div>'
      );
    }).join("");
    wrap.innerHTML = state.votes.length ? rows : '<p class="tally-none">Votes will appear here.</p>';
  }

  function renderAvailabilityTable() {
    var wrap = $("#availability-table");
    if (!wrap) return;
    if (state.votes.length === 0) {
      wrap.innerHTML = '<p class="tally-none">Availability will appear here once people vote.</p>';
      return;
    }

    var weekendDates = DATES.filter(function (d) { return d.key !== "flex"; });
    var header = '<tr><th>Household</th>' + weekendDates.map(function (d) { return "<th>" + d.label + "</th>"; }).join("") + "</tr>";

    var body = state.votes.map(function (p) {
      var cells = weekendDates.map(function (d) {
        var ok = (p.available || []).indexOf(d.key) !== -1;
        return ok ? '<td class="cell-yes">✓</td>' : '<td class="cell-no">—</td>';
      }).join("");
      var flex = (p.available || []).indexOf("flex") !== -1;
      return '<tr><td>' + escapeHtml(p.name) + (flex ? ' <span title="Also flexible on weekdays">🗓️</span>' : "") + "</td>" + cells + "</tr>";
    }).join("");

    var counts = {};
    weekendDates.forEach(function (d) { counts[d.key] = 0; });
    state.votes.forEach(function (p) {
      (p.available || []).forEach(function (k) { if (counts[k] !== undefined) counts[k]++; });
    });
    var all = state.votes.length;
    var summaryCells = weekendDates.map(function (d) {
      var c = counts[d.key];
      if (c === all) return '<td class="cell-summary star">★ ' + all + "/" + all + "</td>";
      return '<td class="cell-summary">' + c + "/" + all + "</td>";
    }).join("");

    wrap.innerHTML =
      '<table class="avail"><thead>' + header + "</thead><tbody>" + body +
      '<tr><td class="cell-summary">Everyone free</td>' + summaryCells + "</tr></tbody></table>";
  }

  function renderVotesList() {
    var list = $("#votes-list");
    if (!list) return;
    if (state.votes.length === 0) {
      list.innerHTML = '<li class="votes-none" style="list-style:none">No votes recorded yet.</li>';
      return;
    }
    list.innerHTML = state.votes.map(function (p) {
      var t = tripById(p.favorite);
      var dates = (p.available || []).map(function (k) { var d = dateByKey(k); return d ? d.label : k; });
      var fav = t ? t.emoji + " " + t.name : "—";
      var note = p.note ? '<div class="v-note">“' + escapeHtml(p.note) + '”</div>' : "";
      return (
        "<li>" +
          '<div class="v-name">' + escapeHtml(p.name) + "</div>" +
          '<div class="v-fav">⭐ Favorite: <strong>' + fav + "</strong></div>" +
          '<div class="v-dates">Free: ' + escapeHtml(dates.join(", ")) + "</div>" +
          note +
        "</li>"
      );
    }).join("");
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------- share links ----------
  function getMyVote() {
    var name = ($("#voter-name") && $("#voter-name").value.trim()) || "";
    if (state.myVoteId) {
      for (var i = 0; i < state.votes.length; i++) if (state.votes[i].id === state.myVoteId) return state.votes[i];
    }
    if (name) {
      for (var j = 0; j < state.votes.length; j++) if (normalize(state.votes[j].name) === normalize(name)) return state.votes[j];
    }
    return state.votes[state.votes.length - 1] || null;
  }

  function buildLink(arr) {
    return location.href.split("#")[0] + "#v=" + encodeVotes(arr);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
    }
    return Promise.resolve(fallbackCopy(text));
  }
  function fallbackCopy(text) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  function flash(btn, msg) {
    var old = btn.textContent;
    btn.textContent = msg;
    setTimeout(function () { btn.textContent = old; }, 2500);
  }

  function importVotes(arr, source) {
    if (!Array.isArray(arr)) return 0;
    var added = 0;
    arr.forEach(function (incoming) {
      if (!incoming || !incoming.name || !incoming.favorite) return;
      var cleaned = {
        name: String(incoming.name),
        favorite: String(incoming.favorite),
        available: Array.isArray(incoming.available) ? incoming.available.filter(function (k) { return dateByKey(k) || k === "flex"; }) : [],
        note: String(incoming.note || ""),
        ts: incoming.ts || new Date().toISOString()
      };
      var saved = upsertVote(cleaned);
      if (source === "all") state.myVoteId = saved.id;
      added++;
    });
    if (added) { saveVotes(); renderResults(); renderVotesList(); }
    return added;
  }

  function handleHash() {
    var m = location.hash.match(/v=([A-Za-z0-9+/=_-]+)/);
    if (!m) return;
    try {
      var arr = decodeVotes(decodeURIComponent(m[1]));
      var n = importVotes(arr, "all");
      history.replaceState(null, "", location.pathname + location.search);
      var status = $("#save-status");
      if (status && n > 0) setStatus(status, "✓ Merged " + n + " vote" + (n > 1 ? "s" : "") + " from the shared link.", "ok");
    } catch (e) { /* ignore bad links */ }
  }

  // ---------- init ----------
  function init() {
    renderTripCards();
    renderFavoritePicker();
    renderAvailabilityPicker();
    renderResults();
    renderVotesList();
    handleHash();

    var seToggle = $("#stay-eat-toggle");
    if (seToggle) {
      renderStayEatPanel();
      seToggle.addEventListener("click", function () {
        var panel = $("#stay-eat-panel");
        if (!panel) return;
        var open = panel.classList.toggle("hidden");
        seToggle.setAttribute("aria-expanded", open ? "false" : "true");
        seToggle.textContent = open
          ? "🏠 Lodging & restaurants (info only)"
          : "Hide lodging & restaurants";
      });
    }

    var form = $("#vote-form");
    if (form) form.addEventListener("submit", handleSave);
    var clearBtn = $("#clear-vote");
    if (clearBtn) clearBtn.addEventListener("click", handleClear);

    $("#copy-my-vote").addEventListener("click", function () {
      var v = getMyVote();
      if (!v) { alert("Save a vote first, then copy your link."); return; }
      copyText(buildLink([v])).then(function (ok) {
        flash($("#copy-my-vote"), ok ? "✓ Copied!" : "Copy failed — select & copy manually.");
      });
    });

    $("#copy-all-votes").addEventListener("click", function () {
      if (state.votes.length === 0) { alert("No votes saved yet."); return; }
      copyText(buildLink(state.votes)).then(function (ok) {
        flash($("#copy-all-votes"), ok ? "✓ Copied!" : "Copy failed — select & copy manually.");
      });
    });

    $("#import-vote").addEventListener("click", function () {
      var val = $("#paste-vote").value.trim();
      var m = val.match(/v=([A-Za-z0-9+/=_-]+)/);
      if (!m) { alert("Couldn't find a vote link in that text."); return; }
      try {
        var n = importVotes(decodeVotes(decodeURIComponent(m[1])), "all");
        alert("Merged " + n + " vote" + (n === 1 ? "" : "s") + " successfully.");
      } catch (e) { alert("That link doesn't look valid."); }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
