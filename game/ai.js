// Tidebound Bazaar — the rival broker. Reads the lot, the tide and the gold,
// then bids with a personality you can learn: hungry when the lot is rich,
// shy when the tide turns against it, and sometimes bluffing high on junk.
import { lotPoints, lotValue } from './cards.js';
import { MAX_BID } from './game.js';

const PERSONALITY = {
  apprentice: { aggression: 0.45, bluff: 0.05, error: 0.45, charterChance: 0.15 },
  merchant: { aggression: 0.65, bluff: 0.15, error: 0.25, charterChance: 0.35 },
  harbormaster: { aggression: 0.8, bluff: 0.25, error: 0.12, charterChance: 0.5 },
};

/**
 * Decide the rival's bid and whether it arms a charter this round.
 * Returns { bid, charter, intent, intentSub } where intent is the readable
 * tell the table shows before the player confirms.
 */
export function rivalTurn(game) {
  const p = PERSONALITY[game.difficulty] || PERSONALITY.merchant;
  const { points } = lotPoints(game.lot, game.favoredSuit);
  const value = lotValue(game.lot);
  const roundsLeft = 8 - game.round + 1;
  const goldPerRound = game.rival.gold / Math.max(1, roundsLeft);

  // What the lot is worth to the rival, in gold: about a third of its points,
  // more when the rival is behind on points and must catch up.
  let target = points * 0.34 * p.aggression;
  if (game.rival.points < game.you.points) target *= 1.25;
  if (game.rival.points > game.you.points + 10) target *= 0.8;
  // Never bid the whole purse on one lot: keep enough to stay in the game.
  target = Math.min(target, goldPerRound * 1.6, game.rival.gold, MAX_BID);
  // Bluff: sometimes bid high on a poor lot to scare the player off the next one.
  const bluffing = game.random() < p.bluff && value <= 12;
  if (bluffing) target = Math.min(MAX_BID, Math.max(target, 7 + game.random() * 3));
  // Error: the rival misreads the tide now and then.
  const error = (game.random() - 0.5) * 2 * p.error * 4;
  let bid = Math.max(0, Math.round(target + error));
  bid = Math.min(bid, game.rival.gold, MAX_BID);

  // Charter: the rival sometimes rings the Storm Bell on a lot whose lowest
  // card drags the value down, or taxes the player when it expects to lose.
  let charter = null;
  const unused = game.rival.charters.filter((c) => !c.used);
  if (unused.length && game.random() < p.charterChance) {
    const lowest = Math.min(...game.lot.map((c) => c.value));
    if (lowest <= 3 && unused.some((c) => c.id === 'storm')) charter = 'storm';
    else if (bid < 4 && unused.some((c) => c.id === 'tax')) charter = 'tax';
    else if (unused.some((c) => c.id === 'smuggler')) charter = 'smuggler';
  }
  if (charter === 'storm' && game.lot.length > 1) {
    let low = game.lot[0];
    for (const card of game.lot) if (card.value < low.value) low = card;
    low.discarded = true;
    game.lot = game.lot.filter((card) => card !== low);
  }
  if (charter === 'smuggler') bid = Math.min(bid + 3, game.rival.gold, MAX_BID + 3);
  if (charter) {
    const card = game.rival.charters.find((c) => c.id === charter);
    if (card) card.used = true;
  }

  // The readable tell: hungry / cautious / bluffing, keyed to the real bid.
  let intent;
  let intentSub;
  if (bid >= 8) {
    intent = '🔥 Rival is hungry for this lot';
    intentSub = 'They lean in, coins already in hand. Expect a big bid — outbid them or let them overpay.';
  } else if (bid >= 4) {
    intent = '🤔 Rival is weighing the lot';
    intentSub = 'A middling bid is coming. A firm bid of your own should take it.';
  } else if (bluffing) {
    intent = '😏 Rival smiles a little too wide';
    intentSub = 'Something is off — they may be bluffing high on a weak lot. Do not chase it.';
  } else {
    intent = '😴 Rival looks bored by this lot';
    intentSub = 'A small bid should steal it cheap. Save your gold for a richer tide.';
  }
  return { bid, charter, intent, intentSub };
}
