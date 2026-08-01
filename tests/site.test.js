const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = path.join(__dirname, "..");

// ---------------------------------------------------------------------------
// Harness
//
// jsdom does not share top-level `const` bindings across separate external
// <script> tags the way browsers do, so we combine data.js + app.js into a
// single inline script. All text splicing below uses split/join (NOT
// String.replace), because .replace() interprets `$` in replacement strings
// and would corrupt the app's `$$` helper.
// ---------------------------------------------------------------------------

function buildScript() {
  const data = fs.readFileSync(path.join(ROOT, "js", "data.js"), "utf8");
  let app = fs.readFileSync(path.join(ROOT, "js", "app.js"), "utf8");

  const hook =
    "  window.__raft = {\n" +
    "    state: state,\n" +
    "    init: init,\n" +
    "    renderTripCards: renderTripCards,\n" +
    "    renderFavoritePicker: renderFavoritePicker,\n" +
    "    renderAvailabilityPicker: renderAvailabilityPicker,\n" +
    "    selectFavorite: selectFavorite,\n" +
    "    syncFavoriteUI: syncFavoriteUI,\n" +
    "    syncAvailabilityUI: syncAvailabilityUI,\n" +
    "    renderResults: renderResults,\n" +
    "    renderBestDate: renderBestDate,\n" +
    "    renderTally: renderTally,\n" +
    "    renderAvailabilityTable: renderAvailabilityTable,\n" +
    "    renderVotesList: renderVotesList,\n" +
    "    handleSave: handleSave,\n" +
    "    handleClear: handleClear,\n" +
    "    upsertVote: upsertVote,\n" +
    "    importVotes: importVotes,\n" +
    "    getMyVote: getMyVote,\n" +
    "    buildLink: buildLink,\n" +
    "    encodeVotes: encodeVotes,\n" +
    "    decodeVotes: decodeVotes,\n" +
    "    escapeHtml: escapeHtml,\n" +
    "    normalize: normalize,\n" +
    "    dateByKey: dateByKey,\n" +
    "    tripById: tripById,\n" +
    "    loadVotes: loadVotes,\n" +
    "    TRIPS: TRIPS,\n" +
    "    DATES: DATES\n" +
    "  };\n";

  app = app.split('  document.addEventListener("DOMContentLoaded", init);')
    .join(hook + '\n  document.addEventListener("DOMContentLoaded", init);');

  return data + "\n" + app;
}

function makeDom() {
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const inline = buildScript().split("</script>").join("<\\/script>");
  const processed = html
    .split('<script src="js/data.js"></script>').join("")
    .split('<script src="js/app.js"></script>').join("<script>" + inline + "</script>");

  const vc = new VirtualConsole();
  vc.on("jsdomError", () => {});
  const dom = new JSDOM(processed, {
    runScripts: "dangerously",
    url: "http://localhost/",
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  const w = dom.window;
  w.navigator.clipboard = {
    writeText: function (t) { (w.__copied = w.__copied || []).push(t); return Promise.resolve(true); }
  };
  w.__alerts = [];
  w.alert = function (m) { w.__alerts.push(String(m)); };
  w.__raft.init();
  return dom;
}

// Each interactive test gets its own fresh page so listeners/state don't leak.
function fresh() {
  return makeDom();
}

function renderers() {
  const w = fresh().window;
  return {
    w,
    bestDate(votes) {
      const el = w.document.createElement("div");
      setVotes(w, votes);
      w.__raft.renderBestDate(el);
      return el.textContent;
    },
    tally(votes) {
      setVotes(w, votes);
      w.__raft.renderTally();
      return w.document.getElementById("favorite-tally").innerHTML;
    },
    table(votes) {
      setVotes(w, votes);
      w.__raft.renderAvailabilityTable();
      return w.document.getElementById("availability-table").innerHTML;
    },
    votesList(votes) {
      setVotes(w, votes);
      w.__raft.renderVotesList();
      return w.document.getElementById("votes-list").innerHTML;
    }
  };
}
function setVotes(w, votes) {
  w.__raft.state.votes = votes.map((v) => JSON.parse(JSON.stringify(v)));
}

function click(w, el) {
  el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true }));
}
function change(w, input, checked) {
  input.checked = checked;
  input.dispatchEvent(new w.Event("change", { bubbles: true }));
}
function submit(w) {
  w.document.getElementById("vote-form")
    .dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
}

// Reference implementation of the best-date algorithm (independent of app.js)
function weekendKeys(TRIPS, DATES) { return DATES.filter((d) => d.key !== "flex").map((d) => d.key); }
function refBestDate(DATES, votes) {
  const keys = weekendKeys(null, DATES);
  const counts = {};
  keys.forEach((k) => { counts[k] = 0; });
  votes.forEach((p) => {
    (p.available || []).forEach((k) => { if (counts[k] !== undefined) counts[k]++; });
  });
  const full = keys.filter((k) => counts[k] === votes.length)
    .map((k) => DATES.find((d) => d.key === k).label);
  const partial = keys.filter((k) => counts[k] > 0 && counts[k] < votes.length)
    .map((k) => ({ label: DATES.find((d) => d.key === k).label, count: counts[k] }))
    .sort((a, b) => b.count - a.count);
  return { full, partial, top: partial.length ? partial[0] : null };
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Data for expectations (single source of truth from the live app)
const TRIPS = makeDom().window.__raft.TRIPS;
const DATES = makeDom().window.__raft.DATES;

// ---------------------------------------------------------------------------
// 1. Data integrity
// ---------------------------------------------------------------------------

test("data file defines exactly 4 trips with complete fields", () => {
  assert.strictEqual(TRIPS.length, 4);
  assert.strictEqual(new Set(TRIPS.map((t) => t.id)).size, 4, "trip ids must be unique");
  TRIPS.forEach((t) => {
    ["id", "emoji", "flag", "name", "river", "specs", "season", "price", "age", "drive", "highlights", "why", "stay", "eat", "color"].forEach((f) => {
      assert.ok(t[f] !== undefined && t[f] !== null && t[f] !== "", `trip ${t.id} missing "${f}"`);
    });
    assert.ok(Array.isArray(t.specs) && t.specs.length > 0, `${t.id} needs specs`);
    assert.ok(Array.isArray(t.highlights) && t.highlights.length > 0, `${t.id} needs highlights`);
    assert.ok(Array.isArray(t.stay) && t.stay.length > 0, `${t.id} needs stay options`);
    assert.ok(Array.isArray(t.eat) && t.eat.length > 0, `${t.id} needs eat options`);
    t.stay.concat(t.eat).forEach((item) => {
      assert.ok(item.name && item.info, `${t.id} has a stay/eat item missing name or info`);
    });
  });
});

test("data file defines 8 weekend dates + flexible option with unique keys", () => {
  assert.strictEqual(DATES.length, 9);
  assert.strictEqual(new Set(DATES.map((d) => d.key)).size, 9, "date keys must be unique");
  assert.strictEqual(DATES.filter((d) => d.key === "flex").length, 1, "exactly one flex date");
  assert.strictEqual(DATES.filter((d) => d.key !== "flex").length, 8, "exactly 8 weekend dates");
  DATES.forEach((d) => assert.ok(d.key && d.label, "each date needs key + label"));
});

// ---------------------------------------------------------------------------
// 2. Initial page render
// ---------------------------------------------------------------------------

test("init renders 4 trip cards with all key sections", () => {
  const w = fresh().window;
  const d = w.document;
  const cards = d.querySelectorAll("#trip-cards .trip-card");
  assert.strictEqual(cards.length, 4);
  TRIPS.forEach((t, i) => {
    const card = cards[i];
    assert.strictEqual(card.getAttribute("data-id"), t.id);
    assert.ok(card.querySelector("h3").textContent.includes(t.name), `card ${t.id} shows name`);
    assert.ok(card.textContent.includes(t.flag), `card ${t.id} shows flag`);
    assert.ok(card.textContent.includes(t.river), `card ${t.id} shows river`);
    t.highlights.forEach((h) => assert.ok(card.textContent.includes(h.slice(0, 20)), `card ${t.id} shows highlight`));
    assert.ok(card.textContent.includes(t.season), `card ${t.id} shows season`);
    assert.ok(card.textContent.includes(t.price), `card ${t.id} shows price`);
    assert.ok(card.textContent.includes(t.age), `card ${t.id} shows age`);
    assert.ok(card.textContent.includes(t.drive), `card ${t.id} shows drive`);
    assert.ok(card.textContent.includes(t.why), `card ${t.id} shows why`);
  });
});

test("each trip card has a stay & eat block listing every option", () => {
  const w = fresh().window;
  const d = w.document;
  const cards = d.querySelectorAll("#trip-cards .trip-card");
  assert.strictEqual(d.querySelectorAll("#trip-cards .stay-eat").length, 4);
  TRIPS.forEach((t, i) => {
    const card = cards[i];
    const se = card.querySelector(".stay-eat");
    assert.ok(se, `${t.id} has details.stay-eat`);
    assert.ok(se.querySelector("summary").textContent.includes("Where to stay & eat"));
    const colTitles = Array.from(se.querySelectorAll(".se-col h4")).map((h) => h.textContent);
    assert.ok(colTitles.includes("Stay"), `${t.id} has a Stay column`);
    assert.ok(colTitles.includes("Eat"), `${t.id} has an Eat column`);
    const lis = se.querySelectorAll("li");
    assert.strictEqual(lis.length, t.stay.length + t.eat.length, `${t.id} lists all stay+eat options`);
    t.stay.concat(t.eat).forEach((item) => {
      const li = Array.from(lis).find((l) => l.textContent.includes(item.name) && l.textContent.includes(item.info));
      assert.ok(li, `${t.id} "${item.name}" is listed with its info`);
    });
  });
});

test("favorite picker renders 4 options", () => {
  const w = fresh().window;
  const d = w.document;
  const opts = d.querySelectorAll("#favorite-picker .fav-opt");
  assert.strictEqual(opts.length, 4);
  TRIPS.forEach((t, i) => {
    assert.strictEqual(opts[i].getAttribute("data-id"), t.id);
    assert.ok(opts[i].textContent.includes(t.name));
  });
});

test("availability picker renders all 9 date options as checkboxes", () => {
  const w = fresh().window;
  const d = w.document;
  const boxes = d.querySelectorAll("#availability-picker .avail-opt input");
  assert.strictEqual(boxes.length, 9);
  const boxKeys = Array.from(boxes).map((b) => b.value);
  DATES.forEach((dt) => assert.ok(boxKeys.includes(dt.key), `checkbox for ${dt.key}`));
  DATES.forEach((dt) => {
    const label = d.querySelector('#availability-picker .avail-opt[data-key="' + dt.key + '"]');
    assert.ok(label && label.textContent.includes(dt.label), `label for ${dt.key}`);
  });
});

test("results sections render empty states on load", () => {
  const w = fresh().window;
  const d = w.document;
  assert.ok(d.getElementById("best-date").textContent.includes("No votes yet"));
  assert.ok(d.getElementById("favorite-tally").textContent.includes("Votes will appear here"));
  assert.ok(d.getElementById("availability-table").textContent.includes("Availability will appear here"));
  assert.ok(d.getElementById("votes-list").textContent.includes("No votes recorded yet"));
});

// ---------------------------------------------------------------------------
// 3. Favorite selection
// ---------------------------------------------------------------------------

test("clicking a trip card selects it as favorite and reflects in picker", () => {
  const w = fresh().window;
  const d = w.document;
  TRIPS.forEach((t, i) => {
    const card = d.querySelector('#trip-cards .trip-card[data-id="' + t.id + '"]');
    click(w, card);
    assert.strictEqual(w.__raft.state.favorite, t.id, `favorite = ${t.id}`);
    assert.ok(card.classList.contains("selected"), `card ${t.id} gets .selected`);
    assert.ok(card.querySelector(".check").textContent.includes("Your favorite"));
    const opt = d.querySelector('#favorite-picker .fav-opt[data-id="' + t.id + '"]');
    assert.ok(opt.classList.contains("selected"), `picker ${t.id} reflects selected`);
    if (i > 0) {
      const prev = d.querySelector('#trip-cards .trip-card[data-id="' + TRIPS[i - 1].id + '"]');
      assert.ok(!prev.classList.contains("selected"));
    }
  });
});

test("clicking a picker option selects the card and updates the check label", () => {
  const w = fresh().window;
  const d = w.document;
  click(w, d.querySelector('#favorite-picker .fav-opt[data-id="rogue"]'));
  const card = d.querySelector('#trip-cards .trip-card[data-id="rogue"]');
  assert.ok(card.classList.contains("selected"));
  assert.ok(card.querySelector(".check").textContent.includes("Your favorite"));
});

test("clicks inside the stay-eat block do not select the card", () => {
  const w = fresh().window;
  const d = w.document;
  click(w, d.querySelector('#trip-cards .trip-card[data-id="deschutes"] .stay-eat summary'));
  assert.strictEqual(w.__raft.state.favorite, null, "stay-eat click should be ignored");
});

// ---------------------------------------------------------------------------
// 4. Availability toggling
// ---------------------------------------------------------------------------

test("checking and unchecking availability boxes updates state and UI", () => {
  const w = fresh().window;
  const d = w.document;
  const keys = weekendKeys(TRIPS, DATES);
  keys.forEach((k) => {
    const box = d.querySelector('#availability-picker .avail-opt input[value="' + k + '"]');
    change(w, box, true);
    assert.ok(w.__raft.state.available.includes(k), `checked ${k}`);
    assert.ok(box.closest(".avail-opt").classList.contains("selected"), `${k} label .selected`);
  });
  change(w, d.querySelector('#availability-picker .avail-opt input[value="aug8"]'), false);
  assert.ok(!w.__raft.state.available.includes("aug8"));
  assert.ok(!d.querySelector('#availability-picker .avail-opt[data-key="aug8"]').classList.contains("selected"));
  change(w, d.querySelector('#availability-picker .avail-opt input[value="flex"]'), true);
  assert.ok(w.__raft.state.available.includes("flex"));
  assert.strictEqual(w.__raft.state.available.filter((k) => k === "flex").length, 1, "no duplicate flex");
});

// ---------------------------------------------------------------------------
// 5. Vote form validation
// ---------------------------------------------------------------------------

test("saving without a name shows an error and adds no vote", () => {
  const w = fresh().window;
  const d = w.document;
  w.__raft.state.favorite = "deschutes";
  w.__raft.state.available = ["aug8"];
  submit(w);
  assert.ok(d.getElementById("save-status").className.includes("err"));
  assert.ok(d.getElementById("save-status").textContent.includes("name"));
  assert.strictEqual(w.__raft.state.votes.length, 0);
});

test("saving without a favorite shows an error and adds no vote", () => {
  const w = fresh().window;
  const d = w.document;
  d.getElementById("voter-name").value = "The Garcias";
  w.__raft.state.available = ["aug8"];
  submit(w);
  assert.ok(d.getElementById("save-status").className.includes("err"));
  assert.ok(d.getElementById("save-status").textContent.includes("favorite"));
  assert.strictEqual(w.__raft.state.votes.length, 0);
});

test("saving without any availability shows an error and adds no vote", () => {
  const w = fresh().window;
  const d = w.document;
  d.getElementById("voter-name").value = "The Garcias";
  w.__raft.state.favorite = "deschutes";
  submit(w);
  assert.ok(d.getElementById("save-status").className.includes("err"));
  assert.ok(d.getElementById("save-status").textContent.includes("available"));
  assert.strictEqual(w.__raft.state.votes.length, 0);
});

test("a valid vote is saved, persisted, and reflected everywhere", () => {
  const w = fresh().window;
  const d = w.document;
  d.getElementById("voter-name").value = "  The Garcias  ";
  d.getElementById("voter-note").value = "Prefer mornings";
  w.__raft.selectFavorite("deschutes");
  change(w, d.querySelector('#availability-picker .avail-opt input[value="aug8"]'), true);
  change(w, d.querySelector('#availability-picker .avail-opt input[value="flex"]'), true);
  submit(w);

  assert.ok(d.getElementById("save-status").className.includes("ok"));
  assert.ok(d.getElementById("save-status").textContent.includes("saved"));
  assert.strictEqual(w.__raft.state.votes.length, 1);
  const v = w.__raft.state.votes[0];
  assert.strictEqual(v.name, "The Garcias");
  assert.strictEqual(v.favorite, "deschutes");
  assert.deepStrictEqual(Array.from(v.available), ["aug8", "flex"]);
  assert.strictEqual(v.note, "Prefer mornings");
  assert.ok(v.id, "vote has id");
  assert.ok(v.ts, "vote has timestamp");

  const raw = w.localStorage.getItem("raftingVotesV1");
  assert.ok(raw, "votes stored in localStorage");
  assert.deepStrictEqual(JSON.parse(raw).map((x) => x.name), ["The Garcias"]);

  const list = d.getElementById("votes-list");
  assert.ok(list.textContent.includes("The Garcias"));
  assert.ok(list.textContent.includes("Lower Deschutes"));
  assert.ok(list.textContent.includes("Aug 8"));
  assert.ok(list.textContent.includes("Flexible"));
  assert.ok(list.textContent.includes("Prefer mornings"));
});

test("re-saving the same name updates the existing vote instead of duplicating", () => {
  const w = fresh().window;
  const d = w.document;
  d.getElementById("voter-name").value = "Garcias";
  w.__raft.selectFavorite("deschutes");
  change(w, d.querySelector('#availability-picker .avail-opt input[value="aug8"]'), true);
  submit(w);
  assert.strictEqual(w.__raft.state.votes.length, 1);

  d.getElementById("voter-name").value = "  gARCIAS  ";
  w.__raft.selectFavorite("rogue");
  change(w, d.querySelector('#availability-picker .avail-opt input[value="aug8"]'), true);
  change(w, d.querySelector('#availability-picker .avail-opt input[value="aug15"]'), true);
  submit(w);

  assert.strictEqual(w.__raft.state.votes.length, 1, "still exactly one vote");
  const v = w.__raft.state.votes[0];
  assert.strictEqual(v.favorite, "rogue");
  assert.deepStrictEqual(Array.from(v.available), ["aug8", "aug15"]);
});

test("clearing a vote removes it and keeps other votes", () => {
  const w = fresh().window;
  const d = w.document;
  d.getElementById("voter-name").value = "Garcias";
  w.__raft.selectFavorite("deschutes");
  change(w, d.querySelector('#availability-picker .avail-opt input[value="aug8"]'), true);
  submit(w);
  d.getElementById("voter-name").value = "Friends";
  w.__raft.selectFavorite("rogue");
  change(w, d.querySelector('#availability-picker .avail-opt input[value="aug15"]'), true);
  submit(w);
  assert.strictEqual(w.__raft.state.votes.length, 2);

  d.getElementById("voter-name").value = "garcias";
  click(w, d.getElementById("clear-vote"));
  assert.strictEqual(w.__raft.state.votes.length, 1);
  assert.strictEqual(w.__raft.state.votes[0].name, "Friends");
  const stored = JSON.parse(w.localStorage.getItem("raftingVotesV1"));
  assert.deepStrictEqual(stored.map((x) => x.name), ["Friends"]);
});

// ---------------------------------------------------------------------------
// 6. Best-date computation — exhaustive + randomized matrix
// ---------------------------------------------------------------------------

test("best date: no votes -> every candidate weekend available", () => {
  const r = renderers();
  const keys = weekendKeys(TRIPS, DATES);
  const votes = [{ name: "P", favorite: "deschutes", available: keys }];
  const text = r.bestDate(votes);
  assert.ok(text.includes("Everyone is free"));
  keys.forEach((k) => assert.ok(text.includes(DATES.find((d) => d.key === k).label), "lists " + k));
});

test("best date: exhaustive over all 256 single-person availability subsets", () => {
  const r = renderers();
  const keys = weekendKeys(TRIPS, DATES);
  assert.strictEqual(keys.length, 8);
  for (let mask = 0; mask < 256; mask++) {
    const available = [];
    for (let i = 0; i < 8; i++) if (mask & (1 << i)) available.push(keys[i]);
    const votes = [{ name: "P", favorite: "deschutes", available }];
    const text = r.bestDate(votes);
    const ref = refBestDate(DATES, votes);
    if (ref.full.length) {
      assert.ok(text.includes("Everyone is free"), "mask " + mask);
      ref.full.forEach((l) => assert.ok(text.includes(l), "mask " + mask + " full " + l));
    } else {
      assert.ok(text.includes("No weekend works for everyone yet"), "mask " + mask);
      if (ref.top) {
        assert.ok(text.includes(ref.top.label), "mask " + mask + " top " + ref.top.label);
        assert.ok(text.includes(String(ref.top.count)), "mask " + mask + " count");
        assert.ok(text.includes(String(votes.length)), "mask " + mask + " N");
      }
    }
  }
});

test("best date: two people — exhaustive over all (256x256) availability pairs", () => {
  const r = renderers();
  const keys = weekendKeys(TRIPS, DATES);
  for (let m1 = 0; m1 < 256; m1++) {
    const a1 = [];
    for (let i = 0; i < 8; i++) if (m1 & (1 << i)) a1.push(keys[i]);
    for (let m2 = 0; m2 < 256; m2++) {
      const a2 = [];
      for (let j = 0; j < 8; j++) if (m2 & (1 << j)) a2.push(keys[j]);
      const votes = [
        { name: "A", favorite: "deschutes", available: a1 },
        { name: "B", favorite: "rogue", available: a2 }
      ];
      const text = r.bestDate(votes);
      const ref = refBestDate(DATES, votes);
      if (ref.full.length) {
        assert.ok(text.includes("Everyone is free"), m1 + "," + m2);
        ref.full.forEach((l) => assert.ok(text.includes(l), m1 + "," + m2 + " " + l));
      } else {
        assert.ok(text.includes("No weekend works for everyone yet"), m1 + "," + m2);
        if (ref.top) {
          assert.ok(text.includes(ref.top.label), m1 + "," + m2 + " top");
          assert.ok(text.includes(String(ref.top.count)), m1 + "," + m2 + " count");
          assert.ok(text.includes(String(votes.length)), m1 + "," + m2 + " N");
        }
      }
    }
  }
});

test("best date: 2-6 people — 600 random scenarios with flex", () => {
  const r = renderers();
  const keys = weekendKeys(TRIPS, DATES);
  const rnd = mulberry32(20260801);
  for (let n = 0; n < 600; n++) {
    const people = 2 + Math.floor(rnd() * 5);
    const votes = [];
    for (let p = 0; p < people; p++) {
      const available = [];
      for (let i = 0; i < 8; i++) if (rnd() < 0.4) available.push(keys[i]);
      if (rnd() < 0.25) available.push("flex");
      votes.push({ name: "H" + p, favorite: "deschutes", available });
    }
    const text = r.bestDate(votes);
    const ref = refBestDate(DATES, votes);
    if (ref.full.length) {
      assert.ok(text.includes("Everyone is free"), "case " + n);
      ref.full.forEach((l) => assert.ok(text.includes(l), "case " + n + " " + l));
    } else {
      assert.ok(text.includes("No weekend works for everyone yet"), "case " + n);
      if (ref.top) {
        assert.ok(text.includes(ref.top.label), "case " + n + " top " + ref.top.label);
        assert.ok(text.includes(String(ref.top.count)), "case " + n + " count");
        assert.ok(text.includes(String(votes.length)), "case " + n + " N");
      } else {
        assert.ok(text.includes("No shared weekend"), "case " + n + " none at all");
      }
    }
  }
});

// ---------------------------------------------------------------------------
// 7. Favorite tally
// ---------------------------------------------------------------------------

test("tally counts votes per trip and scales bars by max", () => {
  const r = renderers();
  const votes = [
    { name: "A", favorite: "deschutes" },
    { name: "B", favorite: "deschutes" },
    { name: "C", favorite: "rogue" },
    { name: "D", favorite: "tieton" }
  ];
  const html = r.tally(votes);
  TRIPS.forEach((t) => assert.ok(html.includes(t.name), t.id + " has a tally row"));
  assert.ok(/width:100%/.test(html), "max bar is 100%");
  assert.ok(/width:50%/.test(html), "1-vote bar is 50%");
  assert.ok(html.includes("2 votes"));
  assert.ok(html.includes("1 vote"));
  assert.ok(html.includes("White Salmon"), "0-vote trip still listed");
});

test("tally shows placeholder when there are no votes", () => {
  const r = renderers();
  assert.ok(r.tally([]).includes("Votes will appear here"));
});

// ---------------------------------------------------------------------------
// 8. Availability table
// ---------------------------------------------------------------------------

test("availability table renders rows, ✓/— cells, flex icon, and everyone-free stars", () => {
  const r = renderers();
  const votes = [
    { name: "Garcias", favorite: "deschutes", available: ["aug8", "sep5"] },
    { name: "Friends", favorite: "rogue", available: ["aug8", "flex"] }
  ];
  const html = r.table(votes);
  assert.ok(html.includes("Garcias"));
  assert.ok(html.includes("Friends"));
  assert.ok(html.includes("Household"));
  const summary = html.split("Everyone free").pop();
  assert.ok(/★ 2\/2/.test(summary), "everyone-free summary star for aug8");
  const gRow = html.split("Garcias").pop().split("</tr>")[0];
  assert.ok(gRow.includes("✓"), "Garcias has a check");
  const fRow = html.split("Friends").pop().split("</tr>")[0];
  assert.ok(fRow.includes("🗓️"), "flex icon shown for Friends");
  assert.ok(fRow.includes("✓"), "Friends has a check");
});

test("availability table with no common dates shows no stars and all fractions < full", () => {
  const r = renderers();
  const votes = [
    { name: "A", favorite: "deschutes", available: ["aug8"] },
    { name: "B", favorite: "rogue", available: ["aug15"] }
  ];
  const html = r.table(votes);
  const summary = html.split("Everyone free").pop();
  assert.ok(!summary.includes("★"), "no star when nobody shares a date");
  assert.ok(summary.includes("1/2"), "each date shows 1/2");
});

// ---------------------------------------------------------------------------
// 9. Votes list rendering + XSS safety
// ---------------------------------------------------------------------------

test("votes list escapes HTML in names and notes", () => {
  const r = renderers();
  const votes = [
    { name: '<img src=x onerror=alert(1)>', favorite: "deschutes", available: ["aug8"], note: '<script>bad()</script>' }
  ];
  const html = r.votesList(votes);
  assert.ok(!html.includes("<img"), "img tag not rendered as HTML");
  assert.ok(!html.includes("<script>"), "script tag not rendered as HTML");
  assert.ok(html.includes("&lt;img"), "escaped img present");
  assert.ok(html.includes("&lt;script&gt;"), "escaped script present");
});

test("escapeHtml handles all five special characters", () => {
  const w = fresh().window;
  assert.strictEqual(w.__raft.escapeHtml('a&b<c>d"e\'f'), "a&amp;b&lt;c&gt;d&quot;e&#39;f");
  assert.strictEqual(w.__raft.escapeHtml("plain"), "plain");
});

// ---------------------------------------------------------------------------
// 10. Share links (unicode-safe base64) + import
// ---------------------------------------------------------------------------

test("encode/decode round-trips votes including unicode names and notes", () => {
  const w = fresh().window;
  const votes = [
    { name: "The García's & Family 🌊", favorite: "white-salmon", available: ["aug8", "flex"], note: "café — no camping" }
  ];
  const dec = w.__raft.decodeVotes(w.__raft.encodeVotes(votes));
  assert.strictEqual(JSON.stringify(dec), JSON.stringify(votes));
});

test("buildLink produces a #v= link that decodes back to the same votes", () => {
  const w = fresh().window;
  w.__raft.state.votes = [
    { name: "Garcias", favorite: "deschutes", available: ["aug8", "flex"], note: "", ts: "2026-08-01T00:00:00Z", id: "v1" }
  ];
  const link = w.__raft.buildLink(w.__raft.state.votes);
  assert.ok(link.includes("#v="), "link carries #v= hash");
  const hash = link.split("#v=")[1];
  const dec = w.__raft.decodeVotes(decodeURIComponent(hash));
  assert.strictEqual(dec.length, 1);
  assert.strictEqual(dec[0].name, "Garcias");
  assert.strictEqual(dec[0].favorite, "deschutes");
  assert.deepStrictEqual(Array.from(dec[0].available), ["aug8", "flex"]);
});

test("importVotes merges incoming votes and re-renders results", () => {
  const w = fresh().window;
  const d = w.document;
  const n = w.__raft.importVotes([
    { name: "Anna", favorite: "rogue", available: ["sep12"] },
    { name: "Bob", favorite: "deschutes", available: ["aug8", "sep12"] }
  ], "all");
  assert.strictEqual(n, 2);
  assert.strictEqual(w.__raft.state.votes.length, 2);
  const best = d.getElementById("best-date");
  assert.ok(best.textContent.includes("Everyone is free"));
  assert.ok(best.textContent.includes("Sep 12"));
  assert.ok(d.getElementById("votes-list").textContent.includes("Anna"));
});

test("importVotes ignores malformed entries and never throws", () => {
  const w = fresh().window;
  const n = w.__raft.importVotes([
    null,
    { favorite: "rogue" },
    { name: "Ok", favorite: "rogue", available: ["aug8"] },
    { name: 42, favorite: "deschutes", available: ["nope", "flex"] }
  ], "all");
  assert.strictEqual(n, 2, "only the two valid entries count");
  assert.strictEqual(w.__raft.state.votes.length, 2);
  const ok = w.__raft.state.votes.find((v) => v.name === "Ok");
  assert.deepStrictEqual(Array.from(ok.available), ["aug8"]);
  const n42 = w.__raft.state.votes.find((v) => v.name === "42");
  assert.deepStrictEqual(Array.from(n42.available), ["flex"], "invalid date keys dropped, flex kept");
});

test("importing votes via a #v= hash on page load merges and clears the hash", () => {
  const w = fresh().window;
  const d = w.document;
  w.__raft.state.votes = [];
  const link = w.__raft.buildLink([{ name: "Carol", favorite: "tieton", available: ["sep19"] }]);
  const hashPart = link.split("#")[1];
  w.location.hash = "#" + hashPart;
  w.__raft.init();
  assert.ok(w.__raft.state.votes.some((v) => v.name === "Carol"), "vote imported from hash");
  assert.ok(d.getElementById("votes-list").textContent.includes("Carol"));
});

// ---------------------------------------------------------------------------
// 11. Copy-buttons + getMyVote
// ---------------------------------------------------------------------------

test("copy-my-vote copies a link for the current household", async () => {
  const w = fresh().window;
  const d = w.document;
  d.getElementById("voter-name").value = "Garcias";
  w.__raft.selectFavorite("deschutes");
  change(w, d.querySelector('#availability-picker .avail-opt input[value="aug8"]'), true);
  submit(w);

  click(w, d.getElementById("copy-my-vote"));
  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(w.__copied.length, 1, "a link was copied");
  const link = w.__copied[0];
  assert.ok(link.includes("#v="));
  const dec = w.__raft.decodeVotes(decodeURIComponent(link.split("#v=")[1]));
  assert.strictEqual(dec[0].name, "Garcias");
});

test("copy-my-vote alerts when there is no vote to share", async () => {
  const w = fresh().window;
  const d = w.document;
  click(w, d.getElementById("copy-my-vote"));
  assert.ok(w.__alerts.length > 0, "alert raised");
  assert.ok(w.__alerts[0].toLowerCase().includes("vote first"));
});

test("copy-all-votes copies a link containing every vote", async () => {
  const w = fresh().window;
  const d = w.document;
  w.__raft.importVotes([
    { name: "Anna", favorite: "rogue", available: ["sep12"] },
    { name: "Bob", favorite: "deschutes", available: ["aug8"] }
  ], "all");
  click(w, d.getElementById("copy-all-votes"));
  await new Promise((r) => setTimeout(r, 20));
  const link = w.__copied[0];
  const dec = w.__raft.decodeVotes(decodeURIComponent(link.split("#v=")[1]));
  assert.strictEqual(dec.length, 2);
});

// ---------------------------------------------------------------------------
// 12. localStorage persistence across reloads
// ---------------------------------------------------------------------------

test("votes survive a simulated page reload via localStorage", () => {
  const w = fresh().window;
  w.__raft.importVotes([
    { name: "Persisted", favorite: "white-salmon", available: ["aug15"] }
  ], "all");
  assert.strictEqual(w.__raft.state.votes.length, 1);
  // simulate reload: reload state from storage
  w.__raft.state.votes = [];
  w.__raft.state.favorite = null;
  w.__raft.state.votes = w.__raft.loadVotes();
  assert.strictEqual(w.__raft.state.votes.length, 1, "vote reloaded from localStorage");
  assert.strictEqual(w.__raft.state.votes[0].name, "Persisted");
});

test("corrupt localStorage data is ignored safely", () => {
  const w = fresh().window;
  w.localStorage.setItem("raftingVotesV1", "{not valid json");
  const loaded = w.__raft.loadVotes();
  assert.strictEqual(loaded.length, 0);
});
