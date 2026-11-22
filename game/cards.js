// Tidebound Bazaar — cargo deck, suits and charter cards. All original names and art.
export const SUITS = {
  anchor: { key: 'anchor', name: 'Anchor', glyph: '⚓', color: '#2f7fb8', flavor: 'Iron and oak, bound for the far docks.' },
  pearl: { key: 'pearl', name: 'Pearl', glyph: '●', color: '#d98bb0', flavor: 'Pale treasure, pried from the deep.' },
  spice: { key: 'spice', name: 'Spice', glyph: '✦', color: '#e07830', flavor: 'Pepper and saffron, worth its weight in gold.' },
  silk: { key: 'silk', name: 'Silk', glyph: '❖', color: '#8a5fd0', flavor: 'Woven moonlight, light as a rumor.' },
};

const CARGO_NAMES = {
  anchor: ['Ballast', 'Chain', 'Harbor Bell', 'Keel Timber', 'Mooring Rope', 'Shipwright Tools', 'Iron Cask', 'Dock Crane'],
  pearl: ['Moon Pearl', 'Oyster Chest', 'Coral Bead', 'Abalone Shell', 'Tide Opal', 'Mermaid Tear', 'Salt Pearl', 'Deep Cameo'],
  spice: ['Saffron Sack', 'Pepper Keg', 'Cinnamon Bale', 'Clove Crate', 'Nutmeg Chest', 'Cardamom Jar', 'Chili Bundle', 'Ginger Root'],
  silk: ['Moonweave Bolt', 'Star Silk', 'Embroidered Sail', 'Velvet Roll', 'Loom Tapestry', 'Silver Thread', 'Court Robe', 'Lantern Silk'],
};

/** Build the 32-card cargo deck: four suits, values 2..9, one named card each. */
export function buildDeck() {
  const deck = [];
  for (const suit of Object.values(SUITS)) {
    for (let value = 2; value <= 9; value += 1) {
      deck.push({
        id: `${suit.key}-${value}`,
        suit: suit.key,
        value,
        name: CARGO_NAMES[suit.key][value - 2],
        glyph: suit.glyph,
        flavor: suit.flavor,
      });
    }
  }
  return deck;
}

/** Fisher-Yates shuffle with a supplied random function (seeded in tests/shots). */
export function shuffleDeck(deck, random) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/** The three one-use Charter cards every merchant holds. */
export function buildCharters() {
  return [
    {
      id: 'smuggler',
      key: '1',
      name: "Smuggler's Coin",
      type: 'CHARTER · BID',
      text: 'Your bid counts +3 this round. You pay only what you bid.',
    },
    {
      id: 'tax',
      key: '2',
      name: 'Harbor Tax',
      type: 'CHARTER · TAX',
      text: 'If the rival wins this lot, they pay +3 extra gold.',
    },
    {
      id: 'storm',
      key: '3',
      name: 'Storm Bell',
      type: 'CHARTER · STORM',
      text: 'Ring it before bidding: the lowest card in the lot is swept away.',
    },
  ];
}

/** Points a lot is worth: favored suit doubles, a matching pair pays +4. */
export function lotPoints(lot, favoredSuit) {
  let points = 0;
  const bySuit = {};
  for (const card of lot) {
    points += card.suit === favoredSuit ? card.value * 2 : card.value;
    bySuit[card.suit] = (bySuit[card.suit] || 0) + 1;
  }
  const pairBonus = Object.values(bySuit).some((n) => n >= 2) ? 4 : 0;
  return { points: points + pairBonus, pairBonus };
}

/** A lot's plain value (no doubling, no bonus) — what the rival sizes up. */
export function lotValue(lot) {
  return lot.reduce((sum, card) => sum + card.value, 0);
}
