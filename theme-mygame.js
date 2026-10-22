// YOUR OWN GAME: this is a starter (a space runner). Change the emojis, colors and words to make it yours.
window.THEME = {
  pageTitle: "Star Dash",
  storageKey: "star-dash-best",

  start: {
    emoji: "🚀⭐",
    title: "Star Dash",
    sub: "Run as far as you can and grab every star.",
    button: "Launch",
    legend: [
      { e: "⭐", t: "collect" },
      { e: "☄️", t: "jump over" },
      { e: "👾", t: "slide under" },
      { e: "🪐", t: "switch lanes" }
    ]
  },

  winScore: null,        // null = endless game that keeps your best score
  lives: 1,
  speedStart: 15,
  speedMax: 32,
  speedAccel: 0.01,

  colors: {
    skyTop: "#05060f", skyBottom: "#1b2a6b",
    ground: "#0e1230", road: "#232b5c", roadEdge: "#6ee7ff", laneLine: "#b5f3ff",
    accent: "#2fb8ff", accentDark: "#1273a6",
    cardBg: "#e8f6ff", cardInk: "#0b1330",
    overlay: "rgba(5, 6, 15, 0.78)", text: "#e8f6ff", gold: "#ffd86b"
  },
  skyEmoji: "🌕",
  scenery: ["🪐", "🌟", "🛰️", "☄️"],
  player: "🧑‍🚀",
  lifeIcon: "💙", lostLifeIcon: "🖤",
  hudIcon: "⭐",

  collectibles: [
    { e: "⭐", pts: 1, w: 6 },
    { e: "🌟", pts: 2, w: 2 }
  ],
  obstacles: {
    jump:  ["☄️"],
    slide: ["👾"],
    block: ["🪐"]
  },

  // A rare power-up that gives a random power. Delete this whole block for no power-ups.
  power: {
    emoji: "⚡",
    minGapPatterns: 7,
    chance: 0.35,
    convertEmoji: "🌟",   // what hazards turn into with the "convert" power
    types: [
      { id: "magnet",  label: "Star magnet!",  icon: "🧲", secs: 8 },
      { id: "convert", label: "Hazards to stars!", icon: "🌟", secs: 8 },
      { id: "double",  label: "Double stars!", icon: "✨", secs: 8 }
    ]
  },

  confetti: { onOpen: false, pieces: ["⭐", "🌟", "✨", "🚀"] },
  milestones: [
    { at: 20, text: "20 stars!" },
    { at: 50, text: "50 stars!" },
    { at: 100, text: "100 stars!" }
  ],

  win: null,             // only used when winScore is a number
  lose: {
    emoji: "💥",
    title: "Crash landing!",
    message: "Nice run. Think you can beat it?",
    button: "Run again"
  }
};
