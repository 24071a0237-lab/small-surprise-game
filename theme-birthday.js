// BIRTHDAY VERSION: edit anything in here. The engine (engine.js) never needs to change.
window.THEME = {
  pageTitle: "Run, Kanna, Run!",
  storageKey: "kanna-birthday-best",

  start: {
    emoji: "🏃❤️",
    title: "Run, Kanna, run!",
    sub: "A birthday game made for Arun. Catch 40 hearts to unlock your surprise.",
    button: "Start running",
    legend: [
      { e: "❤️", t: "catch" },
      { e: "😢", t: "jump over" },
      { e: "😭", t: "slide under" },
      { e: "😿", t: "switch lanes" },
      { e: "💋", t: "power-up" }
    ]
  },

  // How the game plays
  winScore: 40,          // hearts to catch. Set to null for an endless game with no win
  lives: 3,
  speedStart: 14,        // road speed at the beginning
  speedMax: 24,          // road speed never goes above this
  speedAccel: 0.006,     // how quickly it speeds up as you run

  // Look
  colors: {
    skyTop: "#2a0e3d", skyBottom: "#ff7ab0",
    ground: "#4a1a5e", road: "#5a3a78", roadEdge: "#ffd86b", laneLine: "#ffe6f0",
    accent: "#ff4d8d", accentDark: "#c42a69",
    cardBg: "#ffe6f0", cardInk: "#2a0e3d",
    overlay: "rgba(42, 14, 61, 0.72)", text: "#ffe6f0", gold: "#ffd86b"
  },
  skyEmoji: "🌙",
  scenery: ["🌸", "🎈", "🌷", "🎂", "💐"],
  player: "🏃",
  lifeIcon: "❤️", lostLifeIcon: "🖤",
  hudIcon: "❤️",

  // Hearts: they show up all the time. w = how common (bigger = more often)
  collectibles: [
    { e: "❤️", pts: 1, w: 5 },
    { e: "💖", pts: 1, w: 3 },
    { e: "💗", pts: 1, w: 2 }
  ],
  // Crying emojis: dodge these
  obstacles: {
    jump:  ["😢"],          // low: jump over
    slide: ["😭"],          // high: slide under
    block: ["😿"]           // full blocker: change lanes
  },

  // The kiss is a rare power-up. It gives a random power from the list below.
  power: {
    emoji: "💋",
    minGapPatterns: 7,     // at least this many waves of hearts between kisses
    chance: 0.35,          // after that gap, chance per wave that a kiss shows up
    convertEmoji: "😊",    // what crying emojis turn into with the smile power
    types: [
      { id: "magnet",  label: "Heart magnet!",  icon: "🧲", secs: 8 },  // hearts fly to you
      { id: "convert", label: "Smile power!",   icon: "😊", secs: 8 },  // crying emojis become smiles you can collect
      { id: "double",  label: "Double hearts!", icon: "✨", secs: 8 }   // every heart counts twice
    ]
  },

  // Confetti: a shower when the game opens, and at the hearts counts below
  confetti: { onOpen: true, pieces: ["❤️", "💖", "🎉", "✨", "🎂", "💋", "🎈"] },
  milestones: [
    { at: 10, text: "10 hearts! 💖" },
    { at: 20, text: "Halfway there! 🎉" },
    { at: 30, text: "Almost there! 🥳" }
  ],

  // End screens
  win: {
    emoji: "🎂💖",
    title: "Happy Birthday, Kanna! 🎂",
    message: [
      "You dodged every crying emoji and still came out with your arms full of hearts. That’s exactly how I want your whole year to go.",
      "Fair warning: the kisses are unlimited and the hearts have no return policy. You’re stuck with me, Arun, my Kanna. 💖"
    ],
    sign: "Love, your favorite person",
    ps: "P.S. No crying emojis were harmed in the making of this game. (They turned into smiles.)",
    button: "Run again"
  },
  lose: {
    emoji: "😭💔",
    title: "Oh no, too many tears!",
    message: "Don’t worry, Kanna. You still get a kiss for trying. 💋 Want another run?",
    button: "Try again"
  }
};
