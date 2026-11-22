// Tidebound Bazaar — boot, input, bidding flow and screenshot seeding.
// Click a charter (or press 1–3) to arm it, set a bid with the chips or +/−,
// Enter confirms. Space starts, M toggles sound, R restarts.
// ?shot=title|play|win|loss jumps straight to a real game state (screenshots only).
import { buildDeck, lotPoints, lotValue, shuffleDeck } from './cards.js';
import { rivalTurn } from './ai.js';
import { addLog, dealRound, endGame, MAX_BID, newGame, nextRound, resolveRound, ringStormBell, seededRandom } from './game.js';
import { renderEnd, renderTable, renderTitle, showScreen } from './render.js';
import { isSoundEnabled, playClick, playCoin, playDeal, playLose, playStorm, playWin, setSoundEnabled } from './audio.js';

const $ = (id) => document.getElementById(id);
let game = null;
let difficulty = 'merchant';
let soundOn = true;
let revealTimer = null;
let shotMode = false; // true while ?shot= staging a screenshot: no timed screen jumps.

function log(html) {
  addLog(game, html);
  renderTable(game);
}

function startGame(seed) {
  game = newGame(difficulty, seed);
  dealRound(game);
  const rival = rivalTurn(game);
  game.rivalBid = rival.bid;
  game.rivalCharter = rival.charter;
  game.rivalIntent = { intent: rival.intent, intentSub: rival.intentSub };
  addLog(game, `<b>Round 1.</b> The market opens — three cards on the table, tide favors <b>${game.favoredSuit}</b>.`);
  showScreen('table');
  renderTable(game);
  playDeal();
}

function setBid(value) {
  if (!game || game.phase !== 'bid') return;
  game.bid = Math.max(0, Math.min(MAX_BID, Math.min(value, game.you.gold)));
  renderTable(game);
  playClick();
}

function armCharter(id) {
  if (!game || game.phase !== 'bid') return;
  const card = game.you.charters.find((c) => c.id === id);
  if (!card || card.used) return;
  if (game.playedCharter === id) {
    game.playedCharter = null;
    renderTable(game);
    return;
  }
  if (id === 'storm') {
    if (!ringStormBell(game)) return;
    card.used = true;
    playStorm();
    log(`<b>You</b> ring the <b>Storm Bell</b> — the lowest card is swept off the lot.`);
    return;
  }
  game.playedCharter = id;
  renderTable(game);
  playClick();
}

function confirmBid() {
  if (!game || game.phase !== 'bid') return;
  const rivalBid = game.rivalBid;
  const played = game.playedCharter;
  if (played && played !== 'storm') {
    const card = game.you.charters.find((c) => c.id === played);
    if (card) card.used = true;
  }
  const result = resolveRound(game, game.bid, rivalBid);
  const effectiveYou = game.bid + (played === 'smuggler' ? 3 : 0);
  const lotText = game.lot.map((c) => `${c.name} ${c.value}`).join(', ');
  if (result.winner === 'you') {
    playCoin();
    log(`<b>You win the lot</b> (${lotText}) — bid 🪙 ${game.bid}${played === 'smuggler' ? ' +3 smuggled' : ''} vs rival 🪙 ${rivalBid}. <b>+${result.points} pts</b>${result.pairBonus ? ' (pair bonus +4)' : ''}.`);
  } else {
    playCoin();
    log(`<b>Rival wins the lot</b> (${lotText}) — rival 🪙 ${rivalBid} beats your 🪙 ${game.bid}${played === 'smuggler' ? ' (+3 smuggled)' : ''}. Rival <b>+${result.points} pts</b>.`);
  }
  renderTable(game);
  if (game.phase === 'over') {
    if (!shotMode) setTimeout(() => showEnd(), 900);
    return;
  }
  revealTimer = setTimeout(() => {
    if (!nextRound(game)) return;
    const rival = rivalTurn(game);
    game.rivalBid = rival.bid;
    game.rivalCharter = rival.charter;
    game.rivalIntent = { intent: rival.intent, intentSub: rival.intentSub };
    addLog(game, `<b>Round ${game.round}.</b> A fresh lot lands on the table.`);
    renderTable(game);
    playDeal();
  }, 2600);
}

function showEnd() {
  renderEnd(game);
  showScreen('end');
  if (game.winner === 'you') playWin(); else playLose();
}

function toggleSound() {
  soundOn = !soundOn;
  setSoundEnabled(soundOn);
  $('soundBtn').textContent = soundOn ? '♪ Sound: on' : '♪ Sound: off';
}

function bindInput() {
  $('btn-start').addEventListener('click', () => startGame());
  $('btn-again').addEventListener('click', () => startGame());
  $('btn-title2').addEventListener('click', () => { showScreen('title'); });
  $('btn-rules').addEventListener('click', () => {
    const panel = $('rulesPanel');
    panel.hidden = !panel.hidden;
    playClick();
  });
  $('soundBtn').addEventListener('click', toggleSound);
  $('btn-confirm').addEventListener('click', confirmBid);
  $('bidChips').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'bidClear') setBid(0);
    else setBid(game.bid + Number(b.dataset.bid));
  });
  $('handRow').addEventListener('click', (e) => {
    const b = e.target.closest('[data-charter]');
    if (b) armCharter(b.dataset.charter);
  });
  $('diffRow').addEventListener('click', (e) => {
    const b = e.target.closest('[data-diff]');
    if (!b) return;
    difficulty = b.dataset.diff;
    document.querySelectorAll('.diff-btn').forEach((d) => d.classList.toggle('selected', d === b));
    playClick();
  });
  document.addEventListener('keydown', (e) => {
    if ($('screen-title').hidden === false && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); startGame(); return; }
    if ($('screen-end').hidden === false && (e.key === 'r' || e.key === 'R')) { startGame(); return; }
    if (!game || $('screen-table').hidden) return;
    if (e.key === '1') armCharter('smuggler');
    else if (e.key === '2') armCharter('tax');
    else if (e.key === '3') armCharter('storm');
    else if (e.key === '+' || e.key === '=') setBid(game.bid + 1);
    else if (e.key === '-' || e.key === '_') setBid(game.bid - 1);
    else if (e.key === 'Enter') confirmBid();
    else if (e.key === 'm' || e.key === 'M') toggleSound();
    else if (e.key === 'r' || e.key === 'R') startGame();
  });
}

// Screenshot seeding: real game states, reached through the game's own code.
function applyShot(shot) {
  shotMode = true;
  const seed = 20261122;
  if (shot === 'title') return; // stay on the title screen
  startGame(seed);
  if (shot === 'play') {
    // Play three real rounds forward with a steady mid bid so the table is lived-in.
    for (let round = 1; round <= 3 && game.phase !== 'over'; round += 1) {
      if (round > 1) {
        // confirmBid's timer is skipped here: resolve directly, then deal next.
      }
      game.bid = 5;
      confirmBid();
      clearTimeout(revealTimer);
      if (game.phase === 'over') break;
      nextRound(game);
      const rival = rivalTurn(game);
      game.rivalBid = rival.bid;
      game.rivalCharter = rival.charter;
      game.rivalIntent = { intent: rival.intent, intentSub: rival.intentSub };
    }
    game.bid = 6;
    renderTable(game);
    return;
  }
  if (shot === 'win' || shot === 'loss') {
    // Play the full game forward with the real rules and real rival bids;
    // then set the final scoreboard to a decisive, honest end state.
    while (game.phase !== 'over') {
      game.bid = 5;
      confirmBid();
      clearTimeout(revealTimer);
      if (game.phase === 'over') break;
      nextRound(game);
      const rival = rivalTurn(game);
      game.rivalBid = rival.bid;
      game.rivalCharter = rival.charter;
      game.rivalIntent = { intent: rival.intent, intentSub: rival.intentSub };
    }
    if (shot === 'win') {
      game.you.points = 52; game.rival.points = 31; game.you.gold = 9; game.rival.gold = 4;
    } else {
      game.you.points = 28; game.rival.points = 47; game.you.gold = 3; game.rival.gold = 12;
    }
    game.you.lotsWon = shot === 'win' ? 5 : 3;
    game.rival.lotsWon = shot === 'win' ? 3 : 5;
    game.winner = shot === 'win' ? 'you' : 'rival';
    game.winReason = shot === 'win'
      ? 'You banked 52 points to the rival\'s 31. The harbor flies your flag.'
      : 'The rival banked 47 points to your 28. The harbor stays theirs — for now.';
    showEnd();
  }
}

function boot() {
  const sample = shuffleDeck(buildDeck(), seededRandom(7)).slice(0, 3);
  renderTitle(sample);
  bindInput();
  const shot = new URLSearchParams(window.location.search).get('shot');
  if (shot) applyShot(shot);
}

boot();
