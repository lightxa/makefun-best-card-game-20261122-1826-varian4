// Tidebound Bazaar — game state, round flow and scoring. Pure logic, no DOM here.
import { buildCharters, buildDeck, lotPoints, lotValue, shuffleDeck } from './cards.js';

export const TOTAL_ROUNDS = 8;
export const START_GOLD = 30;
export const WIN_POINTS = 50;
export const MAX_BID = 12;

/** A mulberry32 seeded RNG, so ?shot= scenes and replays are deterministic. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newGame(difficulty, seed) {
  const random = seededRandom(seed ?? (Date.now() % 2147483647));
  return {
    difficulty,
    random,
    deck: shuffleDeck(buildDeck(), random),
    round: 1,
    phase: 'bid', // bid | reveal | over
    you: { gold: START_GOLD, points: 0, charters: buildCharters(), lotsWon: 0, goldSpent: 0 },
    rival: { gold: START_GOLD, points: 0, charters: buildCharters(), lotsWon: 0, goldSpent: 0 },
    lot: [],
    favoredSuit: null,
    bid: 0,
    playedCharter: null, // charter id the player armed this round
    rivalCharter: null, // charter id the rival armed this round
    rivalBid: null,
    rivalIntent: null,
    log: [],
    winner: null,
    winReason: '',
    lastResult: null, // { winner, points, goldPaid, lotValue }
  };
}

/** Deal the next lot of three cards and pick the tide's favored suit. */
export function dealRound(game) {
  game.lot = game.deck.splice(0, 3);
  const suits = ['anchor', 'pearl', 'spice', 'silk'];
  game.favoredSuit = suits[Math.floor(game.random() * suits.length)];
  game.phase = 'bid';
  game.bid = 0;
  game.playedCharter = null;
  game.rivalCharter = null;
  game.rivalBid = null;
  game.lastResult = null;
  return game;
}

/** Storm Bell: sweep the lowest card of the lot away before bidding. */
export function ringStormBell(game) {
  if (game.phase !== 'bid' || !game.lot.length) return false;
  let lowest = game.lot[0];
  for (const card of game.lot) if (card.value < lowest.value) lowest = card;
  lowest.discarded = true;
  game.lot = game.lot.filter((card) => card !== lowest);
  return true;
}

/**
 * Resolve a round once both bids are in.
 * Smuggler's Coin adds +3 to the player's effective bid (unpaid).
 * Harbor Tax makes the rival pay +3 gold when they win.
 * Ties go to the rival: a tie is a lost bid, and the player must beat them.
 */
export function resolveRound(game, playerBid, rivalBid) {
  const effectiveYou = playerBid + (game.playedCharter === 'smuggler' ? 3 : 0);
  const effectiveRival = rivalBid;
  const lot = game.lot;
  const { points, pairBonus } = lotPoints(lot, game.favoredSuit);
  let result;
  if (effectiveYou > effectiveRival) {
    const paid = Math.min(playerBid, game.you.gold);
    game.you.gold -= paid;
    game.you.goldSpent += paid;
    game.you.points += points;
    game.you.lotsWon += 1;
    result = { winner: 'you', points, pairBonus, goldPaid: paid, lotValue: lotValue(lot) };
  } else {
    const tax = game.playedCharter === 'tax' ? 3 : 0;
    const paid = Math.min(rivalBid + tax, game.rival.gold);
    game.rival.gold -= paid;
    game.rival.goldSpent += paid;
    game.rival.points += points;
    game.rival.lotsWon += 1;
    result = { winner: 'rival', points, pairBonus, goldPaid: paid, lotValue: lotValue(lot) };
  }
  game.lastResult = result;
  game.phase = 'reveal';
  if (game.you.points >= WIN_POINTS || game.rival.points >= WIN_POINTS) {
    endGame(game);
  } else if (game.round >= TOTAL_ROUNDS) {
    endGame(game);
  }
  return result;
}

export function endGame(game) {
  game.phase = 'over';
  if (game.you.points > game.rival.points) {
    game.winner = 'you';
    game.winReason = `You banked ${game.you.points} points to the rival's ${game.rival.points}. The harbor flies your flag.`;
  } else if (game.rival.points > game.you.points) {
    game.winner = 'rival';
    game.winReason = `The rival banked ${game.rival.points} points to your ${game.you.points}. The harbor stays theirs — for now.`;
  } else {
    game.winner = game.you.gold >= game.rival.gold ? 'you' : 'rival';
    game.winReason = `Points tied ${game.you.points}–${game.rival.points}; the richer purse decides it.`;
  }
}

/** Advance to the next round; returns false when the game is over. */
export function nextRound(game) {
  if (game.phase === 'over') return false;
  game.round += 1;
  dealRound(game);
  return true;
}

/** Append a log line (newest first, capped). */
export function addLog(game, html) {
  game.log.unshift(html);
  if (game.log.length > 6) game.log.length = 6;
}
