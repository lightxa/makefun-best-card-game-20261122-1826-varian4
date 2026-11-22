// Tidebound Bazaar — DOM rendering. Every screen, card and bar is drawn here;
// game.js owns the rules, this file only shows them.
import { SUITS } from './cards.js';
import { TOTAL_ROUNDS } from './game.js';

const $ = (id) => document.getElementById(id);

function suitLabel(key) {
  const s = SUITS[key];
  return `${s.glyph} ${s.name.toUpperCase()}`;
}

export function cargoCardHtml(card, favoredSuit) {
  const suit = SUITS[card.suit];
  const favored = card.suit === favoredSuit;
  return `<div class="card suit-${card.suit}${favored ? ' favored' : ''}">
    <div class="cost">${suit.glyph} ${suit.name}</div>
    <div class="cval">${card.value}</div>
    <div class="glyph">${suit.glyph}</div>
    <div class="cname">${card.name}</div>
    <div class="cart">✦ ${suit.name.toUpperCase()} ✦</div>
    <div class="ctext">${suit.flavor}</div>
  </div>`;
}

export function charterCardHtml(charter, index, active) {
  const used = charter.used ? ' used' : '';
  const on = active ? ' active' : '';
  const disabled = charter.used ? ' disabled' : '';
  return `<button class="charter${used}${on}" data-charter="${charter.id}" type="button"${disabled}>
    <span class="ch-key">${charter.key}</span>
    <div class="ch-name">${charter.name}</div>
    <div class="ch-type">${charter.type}</div>
    <div class="ch-text">${charter.text}</div>
  </button>`;
}

export function renderTitle(sampleCards) {
  $('titleCards').innerHTML = sampleCards.map((c) => cargoCardHtml(c, null)).join('');
}

export function renderTable(game) {
  $('roundLabel').textContent = `ROUND ${Math.min(game.round, TOTAL_ROUNDS)} / ${TOTAL_ROUNDS} · FIRST TO ${50} PTS OR MOST AFTER ROUND ${TOTAL_ROUNDS}`;
  $('tideSuit').textContent = game.favoredSuit ? suitLabel(game.favoredSuit) : '—';
  $('youGold').textContent = `🪙 ${game.you.gold}`;
  $('youPts').textContent = `${game.you.points} pts`;
  $('rivalGold').textContent = `🪙 ${game.rival.gold}`;
  $('rivalPts').textContent = `${game.rival.points} pts`;
  $('youGoldBar').style.width = `${(game.you.gold / 30) * 100}%`;
  $('rivalGoldBar').style.width = `${(game.rival.gold / 30) * 100}%`;

  $('rivalRow').innerHTML =
    `<div class="rival-label">Rival's Charters</div>` +
    game.rival.charters.map((c) => `<div class="mini-card${c.used ? ' used' : ''}">
      <div class="mc-name">${c.name}</div><div>${c.used ? '— spent —' : 'held in hand'}</div></div>`).join('');

  $('marketRow').innerHTML =
    `<div class="market-label">THE LOT</div>` +
    (game.lot.length
      ? game.lot.map((c) => cargoCardHtml(c, game.favoredSuit)).join('')
      : '<div class="plan" style="align-self:center">The lot was swept away by the storm.</div>');

  if (game.rivalIntent) {
    $('intentPlan').textContent = game.rivalIntent.intent;
    $('intentSub').textContent = game.rivalIntent.intentSub;
  }
  $('logLines').innerHTML = game.log.map((line) => `<div>${line}</div>`).join('');

  $('bidValue').textContent = `🪙 ${game.bid}`;
  const canBid = game.phase === 'bid';
  $('btn-confirm').disabled = !canBid;
  document.querySelectorAll('#bidChips button').forEach((b) => { b.disabled = !canBid; });
  $('bidHint').textContent = canBid
    ? (game.playedCharter === 'smuggler'
      ? "Smuggler's Coin armed: your bid counts +3."
      : 'Highest bid wins the lot. Ties go to the rival.')
    : (game.phase === 'reveal' ? 'Lot settled — next round deals shortly.' : '');

  $('handRow').innerHTML = game.you.charters.map((c, i) =>
    charterCardHtml(c, i, game.playedCharter === c.id)).join('');
}

export function renderEnd(game) {
  const won = game.winner === 'you';
  $('screen-end').classList.toggle('lost', !won);
  $('endEmblem').textContent = won ? '👑' : '🌊';
  $('endTitle').textContent = won ? 'YOU OWN THE HARBOR' : 'THE HARBOR SLIPS AWAY';
  $('endSub').textContent = game.winReason;
  $('endStats').innerHTML = `
    <div class="stat"><b>${game.you.points}</b><span>YOUR POINTS</span></div>
    <div class="stat"><b>${game.rival.points}</b><span>RIVAL POINTS</span></div>
    <div class="stat"><b>${game.you.lotsWon} – ${game.rival.lotsWon}</b><span>LOTS WON</span></div>
    <div class="stat"><b>🪙 ${game.you.gold}</b><span>GOLD LEFT</span></div>`;
}

export function showScreen(name) {
  for (const id of ['screen-title', 'screen-table', 'screen-end']) {
    $(id).hidden = id !== `screen-${name}`;
  }
}
