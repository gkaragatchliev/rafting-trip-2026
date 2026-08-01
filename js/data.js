// Trip and date data for the Annual Rafting Trip 2026 site.
// Edit this file to change the options or the candidate weekends.

const TRIPS = [
  {
    id: "deschutes",
    emoji: "🌵",
    flag: "OREGON · CLASSIC",
    name: "Lower Deschutes",
    river: "Deschutes River — Maupin, OR",
    specs: ["Class III–IV", "Half / Full day", "or 2–5 day camp"],
    season: "Season: Apr – Oct",
    price: "Full day ~$105–$139 · overnight from ~$450",
    age: "Ages 6+",
    drive: "2 hr from Portland · <2 hr from Bend",
    highlights: ["Whitehorse, Wapinitia & Boxcar rapids", "2,600-ft basalt canyon", "Bighorn sheep & osprey", "Swimming & rock jumping"],
    why: "Oregon's most-rafted river. Dam-controlled water means it keeps good flows all summer AND fall — the most reliable, flexible option when calendars are tight.",
    stay: [
      { name: "Imperial River Company Lodge", info: "Riverside hotel rooms right at the river, $124–$279/night, on-site restaurant & bar" },
      { name: "CozyCreel Riverhaus (Airbnb)", info: "Top-rated 4.9★ river-view home, walkable to downtown Maupin" },
      { name: "Renewed Downtown Maupin Retreat (Airbnb)", info: "1-bedroom apartment in the middle of town, 4.96★" },
      { name: "Clean 1919 Cabin (Vrbo)", info: "Renovated downtown cabin, sleeps 4, 9.8/10 guest rating" }
    ],
    eat: [
      { name: "The Riverside", info: "Pub food & smoked-pork nachos on a river-view deck in Maupin" },
      { name: "Imperial River Company bar & grill", info: "Casual eats and drinks right at the lodge" },
      { name: "maupinoregon.com/dining", info: "Full directory of the town's local spots" }
    ],
    color: "#1b8f82"
  },
  {
    id: "white-salmon",
    emoji: "🌊",
    flag: "WASHINGTON · WATERFALL",
    name: "White Salmon",
    river: "White Salmon River — Columbia River Gorge, WA",
    specs: ["Class III–IV", "Half or Full day", "Lunch incl. on full day"],
    season: "Season: Jun – Sep",
    price: "Half day ~$88–$130 · Full day ~$150–$170",
    age: "Ages 7–10+",
    drive: "90 min from Portland",
    highlights: ["Husum Falls — 12–14 ft waterfall drop (optional)", "Tallest commercially rafted waterfall in the U.S.", "The Cave, Corkscrew & Rattlesnake rapids", "Glacial melt off Mt. Adams"],
    why: "The 'Best in the West' single-day trip. A wild, undammed gorge and a real waterfall you can choose to run — one of the most unforgettable days in the PNW.",
    stay: [
      { name: "Inn of the White Salmon", info: "Historic boutique hotel, 22 rooms in downtown White Salmon" },
      { name: "Downtown White Salmon Studio (Airbnb)", info: "2-room studio, two blocks from Everybody's Brewing, 4.96★" },
      { name: "Private Suite, Best View in the Gorge (Airbnb)", info: "Mt. Hood & Columbia views with hot tub, 4.96★" },
      { name: "Carson Ridge Luxury Cabins", info: "Upscale cabin retreats set in the Gorge" },
      { name: "Wet Planet raft + stay packages", info: "Bundle your rafting day with lodging in one booking" }
    ],
    eat: [
      { name: "Everybody's Brewing", info: "177 E Jewett Blvd — brewhouse with great pub food & Bavarian pretzel" },
      { name: "Big Horse Brew Pub (Hood River)", info: "The Gorge's original brew pub, pouring for 30+ years" },
      { name: "White Salmon Baking Co", info: "Breakfast & pastries right in downtown" },
      { name: "Soca / Feast", info: "Walkable dinner spots a block off the main street" }
    ],
    color: "#14766d"
  },
  {
    id: "rogue",
    emoji: "🏕️",
    flag: "OREGON · WILDERNESS",
    name: "Rogue River",
    river: "Rogue Wild & Scenic — Grants Pass, OR",
    specs: ["Class II–IV", "3–5 day camping / lodge"],
    season: "Season: May – Sep",
    price: "From ~$1,185–$1,599 pp all-inclusive",
    age: "Ages 7+",
    drive: "~5 hr from Portland",
    highlights: ["Bald eagles, otters & black bears", "Warm water (60s–70s°F)", "Side hikes to mining cabins & hot springs", "No cell service — full unplug"],
    why: "The classic 'week in the woods' with the friend couple. A true wilderness getaway: 35–42 miles, storybook scenery, and the famous Rogue River Trail.",
    stay: [
      { name: "The Lodge at Riverside", info: "Riverfront hotel with pool, walkable to historic downtown Grants Pass" },
      { name: "Riverside Cabin 1 (Airbnb)", info: "Cabin in the heart of downtown, 5-min walk to Riverside Park, 4.96★" },
      { name: "Rogue River Resort cabins", info: "Six riverfront cabins with fire pits, family-friendly, from ~$106/night" },
      { name: "Charming 2BR Cabin (Airbnb)", info: "300 ft from the Rogue, between Medford & Grants Pass, 4.92★" }
    ],
    eat: [
      { name: "The Haul", info: "121 SW H St — craft smoker, pizza & brewery with nixtamal tortillas" },
      { name: "The Bohemian", info: "221 SW G St — first rooftop dining in Southern Oregon" },
      { name: "G Street Bar & Grill", info: "Local favorite on the downtown main strip" }
    ],
    color: "#0f5f59"
  },
  {
    id: "tieton",
    emoji: "🍂",
    flag: "WASHINGTON · SEPT ONLY",
    name: "Tieton River",
    river: "Tieton River — near Naches/Yakima, WA",
    specs: ["Class III–IV", "Day trip", "Nonstop action"],
    season: "Season: September only",
    price: "~$85–$117 per adult",
    age: "Ages 10–12+",
    drive: "~2.75 hr from Seattle",
    highlights: ["Only dam-release river in WA", "Warmest water in the state", "Fall colors & big wave trains", "Finals of the PNW rafting season"],
    why: "The rarest trip of the year — a September-only 'Flip-Flop' dam release. If every summer weekend is already booked, this opens a whole new block of dates no one else has claimed.",
    stay: [
      { name: "White Pass Log Cabin Luxury Retreat (Rimrock)", info: "3BR log cabin with sauna & game room, near the Tieton River, 4.86★ (446 reviews)" },
      { name: "New Modern Cabin on the Tieton River (Naches)", info: "2BR riverside cabin with firepit, from ~$316/night" },
      { name: "River Lover's Paradise (Naches)", info: "Luxe cabin on 7 acres, riverfront, hot tub, sleeps up to 11" },
      { name: "Hummingbird Hill (Naches)", info: "6-acre log home with hot tub, pets welcome, mountain views" }
    ],
    eat: [
      { name: "Nomad Kitchen (Tieton)", info: "700 Maple St — farm-to-table 'hidden jewel', wine bar & tapas" },
      { name: "The Wood Shed (Naches)", info: "8590 WA-410 — pub fare & local beer on a scenic back patio" },
      { name: "Whistlin' Jack's Outpost & Lodge (Naches)", info: "20800 WA-410 — historic fireside restaurant & bar on the way" },
      { name: "D'Nile Taphouse (Naches)", info: "204 Naches Ave — beer tap house in town" }
    ],
    color: "#b0762a"
  }
];

// Candidate weekend blocks for the availability poll (2026).
const DATES = [
  { key: "aug8",   label: "Aug 8–9",   full: "Aug 8–9" },
  { key: "aug15",  label: "Aug 15–16", full: "Aug 15–16" },
  { key: "aug22",  label: "Aug 22–23", full: "Aug 22–23" },
  { key: "aug29",  label: "Aug 29–30", full: "Aug 29–30" },
  { key: "sep5",   label: "Sep 5–6",   full: "Sep 5–6" },
  { key: "sep12",  label: "Sep 12–13", full: "Sep 12–13" },
  { key: "sep19",  label: "Sep 19–20", full: "Sep 19–20" },
  { key: "sep26",  label: "Sep 26–27", full: "Sep 26–27" },
  { key: "flex",   label: "Flexible (weekdays)", full: "Any weekday, flexible" }
];

const STORAGE_KEY = "raftingVotesV1";
