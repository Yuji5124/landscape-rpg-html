/* ============================================================
   ランダム仲間RPG プロトタイプ  app.js
   HTML/CSS/JS のみ。外部ライブラリ不使用。
   データはこのファイル内の配列/オブジェクトで管理する。
   ============================================================ */

'use strict';

/* ============================================================
   1. データ定義
   ============================================================ */

// ---- スキルデータ -------------------------------------------
// type: attack(通常) / strong(強) / heal(単体回復) / healAll(全体回復)
//       buffDef / buffAtk / fire / thunder / ultimate
// minRarity: このスキルを持てる最低レア度
const SKILL_POOL = [
  { name: '通常攻撃',   type: 'attack',  power: 1.0, mp: 0,  target: 'enemy', minRarity: 1, desc: '基本の物理攻撃。' },
  { name: '強攻撃',     type: 'strong',  power: 1.6, mp: 4,  target: 'enemy', minRarity: 2, desc: '力を込めた一撃。' },
  { name: '回復',       type: 'heal',    power: 45,  mp: 6,  target: 'ally',  minRarity: 2, desc: '味方1人のHPを回復する。' },
  { name: '毒攻撃',     type: 'poison',  power: 1.1, mp: 5,  target: 'enemy', minRarity: 3, desc: '敵にダメージを与え、毒状態にする。' },
  { name: '防御アップ', type: 'buffDef', power: 1.5, mp: 4,  target: 'self',  minRarity: 3, desc: '自分の防御力を上げる。' },
  { name: '攻撃アップ', type: 'buffAtk', power: 1.5, mp: 5,  target: 'self',  minRarity: 3, desc: '自分の攻撃力を上げる。' },
  { name: '火属性攻撃', type: 'fire',    power: 1.9, mp: 7,  target: 'enemy', minRarity: 4, element: 'fire',    desc: '炎で敵を焼く。火が弱点の敵に大ダメージ。' },
  { name: 'しびれ攻撃', type: 'paralyze',power: 1.1, mp: 6,  target: 'enemy', minRarity: 5, desc: '敵にダメージを与え、まひさせることがある。' },
  { name: '雷属性攻撃', type: 'thunder', power: 2.1, mp: 8,  target: 'enemy', minRarity: 5, element: 'thunder', desc: '雷撃。雷が弱点の敵に大ダメージ。' },
  { name: '全体回復',   type: 'healAll', power: 55,  mp: 14, target: 'allyAll', minRarity: 6, desc: '味方全員のHPを回復する。' },
  { name: 'そせい',     type: 'revive',  power: 0.6, mp: 12, target: 'allyDead', minRarity: 6, desc: '倒れた味方1人をHP60%で復活させる。' },
  { name: '必殺技',     type: 'ultimate',power: 3.0, mp: 16, target: 'enemy', minRarity: 7, desc: '渾身の大技。絶大なダメージ。' },
  { name: '復活の祈り', type: 'reviveAll',power: 0.8, mp: 28, target: 'none', minRarity: 9, desc: '倒れた味方全員をHP80%で復活させる。' },
];

// 属性のラベル
const ELEMENT_ICON = { fire: '🔥', thunder: '⚡' };
const ELEMENT_NAME = { fire: '火', thunder: '雷' };

// ---- キャラクター名プール（100人分の素材） ------------------
const NAME_PARTS_A = ['アル','ベル','クロ','ディオ','エル','フィ','ガル','ハイ','イヴ','ジン',
  'カイ','ルナ','ミラ','ノヴァ','オル','パル','クィン','リオ','セラ','テオ',
  'ウル','ヴァン','ウィル','ゼン','ヤク','レイ','シオ','メイ','ノア','ラグ'];
const NAME_PARTS_B = ['フィード','バルト','ウス','ディン','レン','ガード','ハルト','イル','ヴェル','ジャ',
  'クス','ロット','ミア','ナル','オン','ファ','スト','リク','ゼル','ティナ'];

// 起動時に100人分のユニークな名前を生成
// A(30) × B(20) = 600通りの組み合わせから先頭100件を採用
const CHARACTER_NAMES = (function buildNames() {
  const set = new Set();
  for (let i = 0; i < NAME_PARTS_A.length && set.size < 100; i++) {
    for (let j = 0; j < NAME_PARTS_B.length && set.size < 100; j++) {
      set.add(NAME_PARTS_A[i] + NAME_PARTS_B[j]);
    }
  }
  return Array.from(set);
})();

// ---- 敵データ（全20ステージ） -------------------------------
// 後半ほど強くなる。HP/攻撃/防御/素早さ を持つ。
const ENEMY_FIGURES = ['🟢','🦂','🐺','🦇','🐗','🕷️','🐍','👹','🐉','💀',
  '👺','🦅','🦁','🐲','👿','🧟','🦖','👾','😈','👑'];
const ENEMY_NAMES = [
  'スライム','サソリ','野良オオカミ','洞窟コウモリ','荒野のイノシシ',
  '大グモ','毒ヘビ','小鬼','若き竜','スケルトン',
  '赤鬼','嵐の鷲','獅子王','双頭竜','悪夢の影',
  'グール将軍','古龍ザード','機械兵ガロン','堕天使ルキフ','魔王ディザスター'];

// 各ステージの弱点属性（null=弱点なし）。fire と thunder を交互気味に配置。
const STAGE_WEAK = [null,'fire',null,'thunder','fire', 'thunder',null,'fire',null,'thunder',
  'fire','thunder','fire',null,'thunder', 'fire',null,'thunder','fire',null];

const STAGES = (function buildStages() {
  const list = [];
  for (let s = 1; s <= 20; s++) {
    // スケーリング：後半ほど強い
    const t = (s - 1);
    const isBoss = (s % 5 === 0); // 5,10,15,20 はボス
    let hp  = 45 + t * 26 + (s >= 18 ? t * 16 : 0);
    let atk = 8  + t * 3.6;
    let def = 3  + t * 2;
    if (isBoss) { hp = Math.round(hp * 1.45); atk = Math.round(atk * 1.1); } // ボスは硬く強い（1回撃破でクリア）
    list.push({
      stage: s,
      name: ENEMY_NAMES[s - 1],
      figure: ENEMY_FIGURES[s - 1],
      isBoss,
      weak: STAGE_WEAK[s - 1],
      // 味方の体力が少なめなので、敵HP・攻撃も控えめにしてテンポ良く
      hp, atk, def,
      spd: 6 + t * 2,
      // 敵が強攻撃を出す確率
      heavyRate: Math.min(0.1 + t * 0.02, 0.42),
    });
  }
  return list;
})();

// ステージごとの仲間ガチャのレア度範囲 [min, max]
function gachaRarityRange(stage) {
  if (stage <= 2)  return [1, 1];
  if (stage <= 4)  return [1, 2];
  if (stage <= 6)  return [1, 3];
  if (stage <= 8)  return [1, 4];
  if (stage <= 10) return [2, 5];
  if (stage <= 12) return [2, 6];
  if (stage <= 14) return [3, 7];
  if (stage <= 16) return [3, 8];
  if (stage <= 18) return [4, 9];
  return [5, 10];
}

/* ============================================================
   2. ユーティリティ
   ============================================================ */
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
let UID = 1;
function nextId() { return 'c' + (UID++); }

// 低レア寄りの重み付き抽選（高レアほど出にくい）
function weightedRarity(min, max) {
  const weights = [];
  let total = 0;
  for (let r = min; r <= max; r++) {
    // レア度が高いほど重みを小さく（指数的に減衰）
    const w = Math.pow(0.55, r - min);
    weights.push(w);
    total += w;
  }
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return min + i;
  }
  return max;
}

/* ============================================================
   3. キャラクター生成（レベルアップ無し・体力少なめ）
   ============================================================
   レベルで育てるのではなく、ガチャでより強い仲間に
   「入れ替えていく」ことで強くなるバランス。
   レベルは生成時の強さの目安（戦闘中に上がることはない）。
   ============================================================ */
function makeStats(rarity, level) {
  const v = () => 1 + Math.random() * 0.12;
  // HPは控えめ（テンポ重視）。攻撃はやや高めで戦闘が長引かないように。
  const maxHp = Math.round((20 + rarity * 8  + level * 3) * v());
  const maxMp = Math.round((12 + rarity * 5  + level * 3) * v());
  const atk   = Math.round((8  + rarity * 4.5 + level * 2.2) * v());
  const def   = Math.round((3  + rarity * 1.8 + level * 1.0) * v());
  const spd   = Math.round((5  + rarity * 2.0 + level * 1.0) * v());
  return { maxHp, maxMp, atk, def, spd };
}

// 通常攻撃は必ず所持。残りはレア度で解放されたものから抽選（最大4）
function assignSkills(rarity) {
  const eligible = SKILL_POOL.filter(s => s.minRarity <= rarity && s.name !== '通常攻撃');
  const chosen = ['通常攻撃'];
  const pool = eligible.slice();
  while (chosen.length < 4 && pool.length > 0) {
    let total = 0; pool.forEach(s => total += s.minRarity);
    let roll = Math.random() * total, idx = 0;
    for (let i = 0; i < pool.length; i++) { roll -= pool[i].minRarity; if (roll <= 0) { idx = i; break; } }
    chosen.push(pool.splice(idx, 1)[0].name);
  }
  return chosen;
}

function createCharacter(rarity, level, avoidNames) {
  rarity = clamp(rarity, 1, 10);
  level = clamp(level || 1, 1, 10);
  const s = makeStats(rarity, level);
  return {
    id: nextId(),
    name: pickName(avoidNames),
    rarity,
    level,
    maxHp: s.maxHp, hp: s.maxHp,
    maxMp: s.maxMp, mp: s.maxMp,
    atk: s.atk, def: s.def, spd: s.spd,
    skills: assignSkills(rarity),
  };
}

// 既存の名前と重複しない名前を選ぶ（avoid: 避けたい名前の配列）
function pickName(avoid) {
  const used = new Set(avoid || []);
  const free = CHARACTER_NAMES.filter(n => !used.has(n));
  return free.length ? pick(free) : pick(CHARACTER_NAMES);
}

function skillByName(name) { return SKILL_POOL.find(s => s.name === name); }

/* ============================================================
   3b. アイテム（戦闘で使えるどうぐ）
   ============================================================ */
// type: healHp / healHpAll / healMp / revive / buffAtk / damage
const ITEM_POOL = [
  { id: 'herb',    name: 'やくそう',   type: 'healHp',    power: 40,  target: 'ally',     desc: '味方1人のHPを40回復する。' },
  { id: 'hiherb',  name: '上やくそう', type: 'healHp',    power: 90,  target: 'ally',     desc: '味方1人のHPを90回復する。' },
  { id: 'allherb', name: 'まんげつ草', type: 'healHpAll', power: 35,  target: 'allyAll',  desc: '味方全員のHPを35回復する。' },
  { id: 'ether',   name: 'まほうの水', type: 'healMp',    power: 30,  target: 'ally',     desc: '味方1人のMPを30回復する。' },
  { id: 'antidote',name: 'どくけし草', type: 'cure',      power: 0,   target: 'ally',     desc: '味方1人の状態異常（毒・まひ）を治す。' },
  { id: 'revive',  name: 'いのちの石', type: 'revive',    power: 0.5, target: 'allyDead', desc: '倒れた味方1人をHP半分で復活させる。' },
  { id: 'power',   name: 'ちからの実', type: 'buffAtk',   power: 1.5, target: 'ally',     desc: '味方1人の攻撃力を上げる。' },
  { id: 'bomb',    name: 'ばくだん石', type: 'damage',    power: 55,  target: 'enemy',    desc: '敵に55の固定ダメージを与える。' },
];
function itemById(id) { return ITEM_POOL.find(i => i.id === id); }

// 最初に持っているどうぐ
function createInitialItems() { return { herb: 4, allherb: 1, ether: 1, antidote: 2, bomb: 1 }; }

// 所持数の増減
function itemCount(id) { return GAME.items[id] || 0; }
function addItem(id, n) { GAME.items[id] = itemCount(id) + n; }
function useItem(id) {
  if (itemCount(id) <= 0) return false;
  GAME.items[id]--;
  if (GAME.items[id] <= 0) delete GAME.items[id];
  return true;
}

// 勝利後にどうぐを獲得する（後半ステージほど良いものが出やすい）
function gainItemsAfterWin(stage) {
  const drops = [];
  const count = rand(1, 2) + (stage >= 10 ? 1 : 0);  // 1〜3個
  for (let i = 0; i < count; i++) {
    // 重み：序盤はやくそう中心、後半は良アイテムも
    const table = [
      { id: 'herb',    w: 40 },
      { id: 'allherb', w: 14 + stage },
      { id: 'ether',   w: 12 },
      { id: 'antidote',w: 12 },
      { id: 'hiherb',  w: stage >= 6 ? 10 + stage : 3 },
      { id: 'bomb',    w: 8 + Math.floor(stage / 2) },
      { id: 'power',   w: stage >= 5 ? 8 : 2 },
      { id: 'revive',  w: stage >= 8 ? 6 : 1 },
    ];
    let total = 0; table.forEach(t => total += t.w);
    let roll = Math.random() * total, picked = table[0];
    for (const t of table) { roll -= t.w; if (roll <= 0) { picked = t; break; } }
    addItem(picked.id, 1);
    drops.push(itemById(picked.id).name);
  }
  return drops;
}

// 初期パーティ：レア度1中心（たまにレア2）
function createInitialParty() {
  const party = [];
  for (let i = 0; i < 4; i++) {
    const rarity = Math.random() < 0.2 ? 2 : 1;
    party.push(createCharacter(rarity, 1, party.map(c => c.name)));
  }
  return party;
}

/* ============================================================
   4. ゲーム状態 & セーブ/ロード
   ============================================================ */
const SAVE_KEY = 'random_party_rpg_save_v3';

let GAME = {
  party: [],          // 現在の4人
  clearedStages: [],  // 完全クリア済みステージ番号
  stageProgress: {},  // ステージ番号 -> これまでの撃破回数
  items: {},          // どうぐ id -> 所持数
};

// そのステージを「クリア扱い（次が解放）」にするのに必要な撃破回数
// ボスは1回の決戦でクリア。通常ステージは2〜3回。
function winsRequired(stage) {
  if (STAGES[stage - 1] && STAGES[stage - 1].isBoss) return 1;
  return stage <= 10 ? 2 : 3;
}
function stageWins(stage) { return GAME.stageProgress[stage] || 0; }
function isStageCleared(stage) { return stageWins(stage) >= winsRequired(stage); }

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      party: GAME.party,
      clearedStages: GAME.clearedStages,
      stageProgress: GAME.stageProgress,
      items: GAME.items,
      uid: UID,
    }));
  } catch (e) { console.warn('保存に失敗:', e); }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data.party || data.party.length === 0) return false;
    GAME.party = data.party;
    GAME.clearedStages = data.clearedStages || [];
    GAME.stageProgress = data.stageProgress || {};
    GAME.items = data.items || {};
    UID = data.uid || UID;
    GAME.party.forEach(c => {
      if (typeof c.level !== 'number') c.level = 1;
      c.hp = c.maxHp; c.mp = c.maxMp; // HP/MPは満タンで復帰
    });
    return true;
  } catch (e) { console.warn('読み込みに失敗:', e); return false; }
}

function hasSave() { return !!localStorage.getItem(SAVE_KEY); }
function clearSave() { localStorage.removeItem(SAVE_KEY); }

function maxUnlockedStage() {
  // 完全クリア済みの最大 + 1。未クリアならステージ1。
  if (GAME.clearedStages.length === 0) return 1;
  return Math.min(20, Math.max(...GAME.clearedStages) + 1);
}

/* ============================================================
   5. 画面遷移
   ============================================================ */
const screens = ['title', 'stage', 'battle', 'gacha'];
function showScreen(name) {
  screens.forEach(s => {
    document.getElementById('screen-' + s).classList.toggle('active', s === name);
  });
}

/* ============================================================
   6. タイトル画面
   ============================================================ */
function initTitle() {
  const info = document.getElementById('title-info');
  const save = hasSave();
  document.getElementById('btn-continue').disabled = !save;
  if (save) {
    // セーブの到達ステージ数を表示
    let reached = 1;
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      const cl = (d && d.clearedStages) || [];
      reached = cl.length ? Math.min(20, Math.max(...cl) + 1) : 1;
    } catch (e) {}
    info.textContent = `セーブデータがあります（ステージ ${reached} まで到達）。`;
  } else {
    info.textContent = 'セーブデータはありません。「はじめる」で開始してください。';
  }
  showScreen('title');
}

document.getElementById('btn-start').addEventListener('click', () => {
  if (hasSave()) {
    if (!confirm('新しく始めると今のデータは消えます。よろしいですか？')) return;
  }
  GAME.party = createInitialParty();
  GAME.clearedStages = [];
  GAME.stageProgress = {};
  GAME.items = createInitialItems();
  saveGame();
  openStageSelect();
});

document.getElementById('btn-continue').addEventListener('click', () => {
  if (loadGame()) openStageSelect();
  else alert('セーブデータが読み込めませんでした。');
});

document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('セーブデータを削除します。よろしいですか？')) {
    clearSave();
    initTitle();
  }
});

document.getElementById('btn-back-title').addEventListener('click', initTitle);

/* ============================================================
   7. ステージ選択画面
   ============================================================ */
function openStageSelect() {
  // パーティのHP/MPを全回復してから選択画面へ
  GAME.party.forEach(c => { c.hp = c.maxHp; c.mp = c.maxMp; });
  renderPartyPreview();
  renderStageGrid();
  showScreen('stage');
}

function rarityClass(r) { return 'rar-' + r; }

// パーティ全体の総合力（各キャラの powerScore 合計）
function partyTotalPower() { return GAME.party.reduce((s, c) => s + powerScore(c), 0); }

// 敵の戦力の目安（HP・攻撃・防御から算出）
function enemyPower(st) { return Math.round(st.hp + st.atk * 8 + st.def * 5); }

// あなたのパーティ基準のステージ難易度
function difficultyOf(stage) {
  const st = STAGES[stage - 1];
  const ratio = partyTotalPower() / Math.max(1, enemyPower(st));
  if (ratio >= 3.0) return { label: '楽勝',       cls: 'diff-easy' };
  if (ratio >= 1.6) return { label: 'ちょうどいい', cls: 'diff-ok' };
  if (ratio >= 1.1) return { label: '手ごわい',     cls: 'diff-hard' };
  return { label: '危険',                           cls: 'diff-danger' };
}

function renderPartyPreview() {
  const el = document.getElementById('party-preview');
  el.innerHTML = '';
  GAME.party.forEach(c => {
    const d = document.createElement('div');
    d.className = 'pcard';
    d.innerHTML = `
      <div class="pc-name">${c.name}</div>
      <div class="pc-meta"><span class="${rarityClass(c.rarity)}">★${c.rarity}</span> ／ Lv.${c.level}
        <span class="pc-power">総合力 ${powerScore(c)}</span></div>
      <div class="pc-stats">HP ${c.maxHp} ・ MP ${c.maxMp}<br>
        攻 ${c.atk} ・ 防 ${c.def} ・ 速 ${c.spd}<br>
        技: ${c.skills.join('、')}</div>`;
    el.appendChild(d);
  });
  const powerEl = document.getElementById('party-power');
  if (powerEl) powerEl.innerHTML = `⚔ パーティ総合力 <b>${partyTotalPower()}</b>`;
  renderItemBar();
}

// 所持アイテムの一覧表示（ステージ選択画面）
function renderItemBar() {
  const el = document.getElementById('item-bar');
  if (!el) return;
  const ids = Object.keys(GAME.items).filter(id => itemCount(id) > 0);
  if (ids.length === 0) { el.innerHTML = '<span class="item-empty">どうぐ：なし</span>'; return; }
  el.innerHTML = '<span class="item-label">どうぐ：</span>' +
    ids.map(id => `<span class="item-chip">${itemById(id).name}<b>×${itemCount(id)}</b></span>`).join('');
}

function renderStageGrid() {
  const grid = document.getElementById('stage-grid');
  grid.innerHTML = '';
  const unlocked = maxUnlockedStage();
  STAGES.forEach(st => {
    const cleared = isStageCleared(st.stage);
    const locked = st.stage > unlocked;
    const need = winsRequired(st.stage);
    const wins = Math.min(stageWins(st.stage), need);
    const cell = document.createElement('div');
    cell.className = 'stage-cell' + (locked ? ' locked' : '') + (cleared ? ' cleared' : '');
    const [rmin, rmax] = gachaRarityRange(st.stage);
    // 撃破ピップ（●＝撃破済 / ○＝未）
    const pips = '●'.repeat(wins) + '○'.repeat(Math.max(0, need - wins));
    const diff = locked ? null : difficultyOf(st.stage);
    if (st.isBoss) cell.classList.add('boss');
    const weakIcon = st.weak ? ` ${ELEMENT_ICON[st.weak]}` : '';
    cell.innerHTML = `
      ${cleared ? '<span class="clear-mark">✓</span>' : ''}
      ${st.isBoss ? '<span class="boss-mark">BOSS</span>' : ''}
      <div class="stage-num">${st.stage}</div>
      <div class="stage-enemy">${st.figure} ${st.name}${weakIcon}</div>
      <div class="stage-pips ${cleared ? 'done' : ''}">${pips}</div>
      ${diff ? `<div class="stage-diff ${diff.cls}">${diff.label}</div>` : ''}
      <div class="stage-tag">仲間 ★${rmin}〜${rmax}</div>`;
    if (!locked) cell.addEventListener('click', () => startBattle(st.stage));
    grid.appendChild(cell);
  });
}

/* ============================================================
   8. 戦闘
   ============================================================ */
let BATTLE = null;

function startBattle(stageNum) {
  const st = STAGES[stageNum - 1];
  // パーティを戦闘用に複製（HP/MPは現在値を満タンに）
  GAME.party.forEach(c => { c.hp = c.maxHp; c.mp = c.maxMp; });
  BATTLE = {
    stage: stageNum,
    enemy: {
      name: st.name, figure: st.figure,
      maxHp: st.hp, hp: st.hp,
      atk: st.atk, def: st.def, spd: st.spd,
      heavyRate: st.heavyRate,
      isBoss: st.isBoss, weak: st.weak,
      status: { poison: 0, paralyze: 0 },
      enraged: false,
    },
    queue: [],         // このラウンドで行動する味方index
    currentAlly: null, // 行動中の味方
    busy: false,       // アニメ/メッセージ進行中フラグ
    over: false,
  };
  // バフ・状態異常などの一時状態を初期化
  GAME.party.forEach(c => {
    c.atkBuff = 1; c.defBuff = 1; c.guarding = false;
    c.status = { poison: 0, paralyze: 0 };
  });

  const need = winsRequired(stageNum);
  const wins = Math.min(stageWins(stageNum), need);
  document.getElementById('battle-stage-info').textContent =
    `ステージ ${stageNum} ／ 20　　撃破 ${wins}/${need}`;
  const fig = document.getElementById('enemy-figure');
  fig.textContent = st.figure;
  fig.classList.toggle('boss', !!st.isBoss);
  document.getElementById('enemy-name').textContent = (st.isBoss ? '【BOSS】' : '') + st.name;
  document.getElementById('message-window').innerHTML = '';
  document.getElementById('battle-fx').textContent = '';

  showScreen('battle');
  renderEnemyHp();
  renderPartyPanel();
  if (st.isBoss) logMsg(`ボス ${st.name} が立ちはだかる！`, 'sys');
  else logMsg(`${st.name} があらわれた！`, 'sys');
  if (st.weak) logMsg(`${st.name} は ${ELEMENT_NAME[st.weak]}属性 が弱点のようだ。`, 'sys');
  if (wins > 0 && !isStageCleared(stageNum)) {
    logMsg(`このステージはあと ${need - wins} 回撃破すると次へ進める。`, 'sys');
  }
  startRound();
}

function aliveAllies() { return GAME.party.filter(c => c.hp > 0); }

/* ---- 状態異常（毒・まひ） ---- */
// 毒のダメージを与える。死亡した場合は true を返す
function applyPoisonTick(entity, isEnemy) {
  if (!entity.status || entity.status.poison <= 0) return false;
  const maxHp = isEnemy ? entity.maxHp : entity.maxHp;
  const dmg = Math.max(2, Math.round(maxHp * 0.07));
  entity.hp = Math.max(0, entity.hp - dmg);
  entity.status.poison--;
  const name = isEnemy ? entity.name : entity.name;
  const el = isEnemy ? document.getElementById('enemy-figure') : allyCardEl(entity);
  fx('🟣'); popNumber(el, dmg, 'pop-poison');
  logMsg(`${name} は毒で ${dmg} のダメージ！`, 'dmg');
  return entity.hp <= 0;
}
// まひ判定：行動できないなら true（同時にターン消費して解除を進める）
function isParalyzed(entity) {
  if (!entity.status || entity.status.paralyze <= 0) return false;
  entity.status.paralyze--;
  return Math.random() < 0.5; // 50%で行動不能
}
function cureStatus(entity) { entity.status = { poison: 0, paralyze: 0 }; }
function statusIcons(entity) {
  if (!entity.status) return '';
  let s = '';
  if (entity.status.poison > 0)   s += '<span class="st-poison" title="毒">🟣</span>';
  if (entity.status.paralyze > 0) s += '<span class="st-para" title="まひ">⚡</span>';
  return s;
}

function startRound() {
  if (BATTLE.over) return;
  // ガード状態リセット（前ラウンドの防御は解除）
  GAME.party.forEach(c => { c.guarding = false; });
  // 行動キュー = 生存している味方（パーティ順）
  BATTLE.queue = GAME.party
    .map((c, i) => ({ c, i }))
    .filter(o => o.c.hp > 0)
    .map(o => o.i);
  nextAllyTurn();
}

function nextAllyTurn() {
  if (BATTLE.over) return;
  if (BATTLE.queue.length === 0) {
    // 全味方行動済み → 敵のターン
    enemyTurn();
    return;
  }
  const idx = BATTLE.queue.shift();
  const ally = GAME.party[idx];
  if (ally.hp <= 0) { nextAllyTurn(); return; } // 途中で倒れた場合スキップ
  BATTLE.currentAlly = ally;
  renderPartyPanel();

  // ターン開始時の状態異常処理（毒ダメージ→まひ判定）
  if (applyPoisonTick(ally, false)) {
    logMsg(`${ally.name} はたおれた！`, 'sys');
    renderPartyPanel();
    if (aliveAllies().length === 0) { setTimeout(loseBattle, 800); return; }
    setTimeout(nextAllyTurn, 700); return;
  }
  if (isParalyzed(ally)) {
    logMsg(`${ally.name} はしびれて動けない！`, 'sys');
    renderPartyPanel();
    setTimeout(nextAllyTurn, 700); return;
  }
  showCommandMenu(ally);
}

// ---- コマンドUI ---------------------------------------------
function showCommandMenu(ally) {
  const cmd = document.getElementById('command-window');
  cmd.innerHTML = `<div class="cmd-title">${ally.name} のターン</div>
    <div class="cmd-grid">
      <button class="cmd-btn" data-act="attack">⚔ 攻撃</button>
      <button class="cmd-btn" data-act="skill">✨ スキル</button>
      <button class="cmd-btn" data-act="item">🎒 どうぐ</button>
      <button class="cmd-btn" data-act="guard">🛡 防御</button>
    </div>`;
  cmd.querySelector('[data-act="attack"]').onclick = () =>
    doAllyAction(ally, SKILL_POOL[0]); // 通常攻撃
  cmd.querySelector('[data-act="guard"]').onclick = () => doGuard(ally);
  cmd.querySelector('[data-act="skill"]').onclick = () => showSkillMenu(ally);
  cmd.querySelector('[data-act="item"]').onclick = () => showItemMenu(ally);
}

// ---- どうぐメニュー -----------------------------------------
function showItemMenu(ally) {
  const cmd = document.getElementById('command-window');
  const ids = Object.keys(GAME.items).filter(id => itemCount(id) > 0);
  let html = `<div class="cmd-title">どうぐを使う</div>`;
  if (ids.length === 0) {
    html += `<div class="cmd-empty">どうぐを持っていない。</div>`;
  } else {
    html += `<div class="cmd-grid">`;
    ids.forEach(id => {
      const it = itemById(id);
      html += `<button class="cmd-btn" data-item="${id}" title="${it.desc}">
        ${it.name}<span class="cmd-mp">×${itemCount(id)}</span></button>`;
    });
    html += `</div>`;
  }
  html += `<div class="cmd-grid one" style="margin-top:8px">
      <button class="cmd-btn" data-back="1">← もどる</button></div>`;
  cmd.innerHTML = html;
  ids.forEach(id => {
    const btn = cmd.querySelector(`[data-item="${id}"]`);
    if (btn) btn.onclick = () => chooseItem(ally, itemById(id));
  });
  cmd.querySelector('[data-back="1"]').onclick = () => showCommandMenu(ally);
}

// 対象が必要なアイテムは味方を選ばせる
function chooseItem(ally, item) {
  const needsTarget = item.target === 'ally' || item.target === 'allyDead';
  if (!needsTarget) { doItemAction(ally, item); return; }

  const cmd = document.getElementById('command-window');
  const wantDead = item.target === 'allyDead';
  let html = `<div class="cmd-title">${item.name} の対象を選ぶ</div><div class="cmd-grid">`;
  GAME.party.forEach((c, i) => {
    // 復活は倒れた味方のみ、それ以外は生存者のみ
    const ok = wantDead ? c.hp <= 0 : c.hp > 0;
    html += `<button class="cmd-btn" data-t="${i}" ${ok ? '' : 'disabled'}>
      ${c.name}<span class="cmd-mp">${c.hp}/${c.maxHp}</span></button>`;
  });
  html += `</div><div class="cmd-grid one" style="margin-top:8px">
      <button class="cmd-btn" data-back="1">← もどる</button></div>`;
  cmd.innerHTML = html;
  GAME.party.forEach((c, i) => {
    const btn = cmd.querySelector(`[data-t="${i}"]`);
    if (btn && !btn.disabled) btn.onclick = () => doItemAction(ally, item, c);
  });
  cmd.querySelector('[data-back="1"]').onclick = () => showItemMenu(ally);
}

// アイテムを使用（その味方の1ターンを消費する）
function doItemAction(ally, item, target) {
  clearCommand();
  useItem(item.id);

  switch (item.type) {
    case 'healHp': {
      const t = target || ally;
      const before = t.hp;
      t.hp = Math.min(t.maxHp, t.hp + item.power);
      fx('💚');
      popNumber(allyCardEl(t), '+' + (t.hp - before), 'pop-heal');
      logMsg(`${ally.name} は ${item.name} を使った。${t.name} のHPが ${t.hp - before} 回復！`, 'heal');
      break;
    }
    case 'healHpAll': {
      let txt = [];
      aliveAllies().forEach(t => { const b = t.hp; t.hp = Math.min(t.maxHp, t.hp + item.power); txt.push(`${t.name}+${t.hp - b}`); popNumber(allyCardEl(t), '+' + (t.hp - b), 'pop-heal'); });
      fx('🌿');
      logMsg(`${ally.name} は ${item.name} を使った。味方全員が回復！（${txt.join('、')}）`, 'heal');
      break;
    }
    case 'healMp': {
      const t = target || ally;
      const before = t.mp;
      t.mp = Math.min(t.maxMp, t.mp + item.power);
      fx('🔵');
      logMsg(`${ally.name} は ${item.name} を使った。${t.name} のMPが ${t.mp - before} 回復！`, 'heal');
      break;
    }
    case 'revive': {
      const t = target;
      t.hp = Math.max(1, Math.round(t.maxHp * item.power));
      fx('✨');
      popNumber(allyCardEl(t), 'REVIVE', 'pop-heal');
      logMsg(`${ally.name} は ${item.name} を使った。${t.name} が復活した！`, 'heal');
      break;
    }
    case 'buffAtk': {
      const t = target || ally;
      t.atkBuff = Math.min(2.5, t.atkBuff * item.power);
      fx('🔺');
      logMsg(`${ally.name} は ${item.name} を使った。${t.name} の攻撃力が上がった！`, 'sys');
      break;
    }
    case 'cure': {
      const t = target || ally;
      cureStatus(t);
      fx('🟢');
      logMsg(`${ally.name} は ${item.name} を使った。${t.name} の状態異常が治った！`, 'heal');
      break;
    }
    case 'damage': {
      let dmg = item.power;
      BATTLE.enemy.hp = Math.max(0, BATTLE.enemy.hp - dmg);
      fx('💣');
      shakeEnemy();
      popNumber(document.getElementById('enemy-figure'), dmg, 'pop-dmg');
      logMsg(`${ally.name} は ${item.name} を投げた！ ${BATTLE.enemy.name} に ${dmg} のダメージ！`, 'dmg');
      break;
    }
  }

  renderEnemyHp();
  renderPartyPanel();

  if (BATTLE.enemy.hp <= 0) { setTimeout(winBattle, 700); return; }
  setTimeout(nextAllyTurn, 700);
}

function showSkillMenu(ally) {
  const cmd = document.getElementById('command-window');
  let html = `<div class="cmd-title">${ally.name} のスキル（MP ${ally.mp}/${ally.maxMp}）</div><div class="cmd-grid">`;
  const hasDead = GAME.party.some(c => c.hp <= 0);
  ally.skills.forEach((sn, i) => {
    const sk = skillByName(sn);
    // 復活系は倒れた味方がいないと使えない
    const noTarget = (sk.type === 'revive' || sk.type === 'reviveAll') && !hasDead;
    const disabled = (ally.mp < sk.mp || noTarget) ? 'disabled' : '';
    html += `<button class="cmd-btn" data-i="${i}" ${disabled} title="${sk.desc}">
      ${sk.name}<span class="cmd-mp">MP${sk.mp}</span></button>`;
  });
  html += `</div><div class="cmd-grid one" style="margin-top:8px">
      <button class="cmd-btn" data-back="1">← もどる</button></div>`;
  cmd.innerHTML = html;
  ally.skills.forEach((sn, i) => {
    const btn = cmd.querySelector(`[data-i="${i}"]`);
    if (btn && !btn.disabled) btn.onclick = () => chooseSkill(ally, skillByName(sn));
  });
  cmd.querySelector('[data-back="1"]').onclick = () => showCommandMenu(ally);
}

// 回復系は対象（味方）を選ばせる
function chooseSkill(ally, sk) {
  // 対象選択が必要なスキル（味方1人 / 倒れた味方1人）
  if (sk.target === 'ally' || sk.target === 'allyDead') {
    const wantDead = sk.target === 'allyDead';
    const cmd = document.getElementById('command-window');
    let html = `<div class="cmd-title">${sk.name} の対象を選ぶ</div><div class="cmd-grid">`;
    GAME.party.forEach((c, i) => {
      const ok = wantDead ? c.hp <= 0 : c.hp > 0;
      html += `<button class="cmd-btn" data-t="${i}" ${ok ? '' : 'disabled'}>${c.name}<span class="cmd-mp">${c.hp}/${c.maxHp}</span></button>`;
    });
    html += `</div><div class="cmd-grid one" style="margin-top:8px">
      <button class="cmd-btn" data-back="1">← もどる</button></div>`;
    cmd.innerHTML = html;
    GAME.party.forEach((c, i) => {
      const btn = cmd.querySelector(`[data-t="${i}"]`);
      if (btn && !btn.disabled) btn.onclick = () => doAllyAction(ally, sk, c);
    });
    cmd.querySelector('[data-back="1"]').onclick = () => showSkillMenu(ally);
  } else {
    doAllyAction(ally, sk);
  }
}

function clearCommand() { document.getElementById('command-window').innerHTML = ''; }

// ---- 味方の行動実行 -----------------------------------------
function doGuard(ally) {
  clearCommand();
  ally.guarding = true;
  logMsg(`${ally.name} は身をまもっている。`);
  fx('🛡');
  setTimeout(nextAllyTurn, 600);
}

function doAllyAction(ally, sk, target) {
  clearCommand();
  if (sk.mp > 0) ally.mp = Math.max(0, ally.mp - sk.mp);

  switch (sk.type) {
    case 'attack':
    case 'strong':
    case 'fire':
    case 'thunder':
    case 'poison':
    case 'paralyze':
    case 'ultimate': {
      // 物理/属性ダメージ
      const elemental = (sk.type === 'fire' || sk.type === 'thunder');
      const ignoreDef = (elemental || sk.type === 'ultimate') ? 0.4 : 0;
      const atk = ally.atk * ally.atkBuff;
      const eff = BATTLE.enemy.def * (1 - ignoreDef);
      let dmg = Math.round((atk * sk.power - eff) * (0.9 + Math.random() * 0.2));
      dmg = Math.max(1, dmg);
      // 弱点判定（属性が敵の弱点と一致したら1.6倍）
      const isWeak = sk.element && BATTLE.enemy.weak === sk.element;
      if (isWeak) dmg = Math.round(dmg * 1.6);
      BATTLE.enemy.hp = Math.max(0, BATTLE.enemy.hp - dmg);
      const icon = sk.type === 'fire' ? '🔥' : sk.type === 'thunder' ? '⚡'
        : sk.type === 'ultimate' ? '💥' : sk.type === 'poison' ? '🟣'
        : sk.type === 'paralyze' ? '✨' : '⚔';
      fx(icon);
      shakeEnemy();
      popNumber(document.getElementById('enemy-figure'), dmg, 'pop-dmg' + (sk.type === 'ultimate' || isWeak ? ' big' : ''));
      logMsg(`${ally.name} の ${sk.name}！ ${BATTLE.enemy.name} に ${dmg} のダメージ！${isWeak ? ' 弱点をついた！' : ''}`, 'dmg');
      // 状態異常の付与
      if (sk.type === 'poison' && BATTLE.enemy.hp > 0 && Math.random() < 0.8) {
        BATTLE.enemy.status.poison = Math.max(BATTLE.enemy.status.poison, 3);
        logMsg(`${BATTLE.enemy.name} は毒におかされた！`, 'sys');
      }
      if (sk.type === 'paralyze' && BATTLE.enemy.hp > 0 && Math.random() < 0.5) {
        BATTLE.enemy.status.paralyze = Math.max(BATTLE.enemy.status.paralyze, 2);
        logMsg(`${BATTLE.enemy.name} はしびれて動けなくなった！`, 'sys');
      }
      break;
    }
    case 'heal': {
      const t = target || ally;
      const heal = sk.power + ally.rarity * 4 + ally.level * 2;
      const before = t.hp;
      t.hp = Math.min(t.maxHp, t.hp + heal);
      fx('💚');
      popNumber(allyCardEl(t), '+' + (t.hp - before), 'pop-heal');
      logMsg(`${ally.name} の ${sk.name}！ ${t.name} のHPが ${t.hp - before} 回復した。`, 'heal');
      break;
    }
    case 'healAll': {
      const heal = sk.power + ally.rarity * 4 + ally.level * 2;
      let txt = [];
      aliveAllies().forEach(t => {
        const before = t.hp;
        t.hp = Math.min(t.maxHp, t.hp + heal);
        txt.push(`${t.name}+${t.hp - before}`);
        popNumber(allyCardEl(t), '+' + (t.hp - before), 'pop-heal');
      });
      fx('🌿');
      logMsg(`${ally.name} の ${sk.name}！ 味方全員が回復した。（${txt.join('、')}）`, 'heal');
      break;
    }
    case 'buffAtk': {
      ally.atkBuff = Math.min(2.5, ally.atkBuff * sk.power);
      fx('🔺');
      logMsg(`${ally.name} の攻撃力が上がった！`, 'sys');
      break;
    }
    case 'buffDef': {
      ally.defBuff = Math.min(2.5, ally.defBuff * sk.power);
      fx('🔷');
      logMsg(`${ally.name} の防御力が上がった！`, 'sys');
      break;
    }
    case 'revive': {
      const t = target;
      t.hp = Math.max(1, Math.round(t.maxHp * sk.power));
      fx('✨');
      popNumber(allyCardEl(t), 'REVIVE', 'pop-heal');
      logMsg(`${ally.name} の ${sk.name}！ ${t.name} が復活した！（HP ${t.hp}）`, 'heal');
      break;
    }
    case 'reviveAll': {
      const dead = GAME.party.filter(c => c.hp <= 0);
      dead.forEach(t => { t.hp = Math.max(1, Math.round(t.maxHp * sk.power)); popNumber(allyCardEl(t), 'REVIVE', 'pop-heal'); });
      fx('🌟');
      logMsg(`${ally.name} の ${sk.name}！ 倒れた味方が復活した！（${dead.map(d => d.name).join('、') || 'なし'}）`, 'heal');
      break;
    }
  }

  renderEnemyHp();
  renderPartyPanel();

  // 勝利判定
  if (BATTLE.enemy.hp <= 0) {
    setTimeout(winBattle, 700);
    return;
  }
  setTimeout(nextAllyTurn, 700);
}

// 敵が味方1人に物理ダメージを与える共通処理
function enemyHitAlly(target, mult, label) {
  let dmg = Math.round((BATTLE.enemy.atk * mult - target.def * target.defBuff) * (0.9 + Math.random() * 0.2));
  dmg = Math.max(1, dmg);
  if (target.guarding) dmg = Math.max(1, Math.round(dmg * 0.5));
  target.hp = Math.max(0, target.hp - dmg);
  popNumber(allyCardEl(target), dmg, 'pop-dmg' + (mult > 1.3 ? ' big' : ''));
  logMsg(`${BATTLE.enemy.name} の${label}！ ${target.name} に ${dmg} のダメージ！`, 'dmg');
  if (target.hp <= 0) logMsg(`${target.name} はたおれた！`, 'sys');
}

// ---- 敵のターン ---------------------------------------------
function enemyTurn() {
  if (BATTLE.over) return;
  const e = BATTLE.enemy;

  // 敵の毒ダメージ（ターン開始時）
  if (e.status.poison > 0) {
    if (applyPoisonTick(e, true)) { renderEnemyHp(); setTimeout(winBattle, 700); return; }
    renderEnemyHp();
  }
  // 敵のまひ判定
  if (isParalyzed(e)) {
    logMsg(`${e.name} はしびれて動けない！`, 'sys');
    renderPartyPanel();
    setTimeout(startRound, 900);
    return;
  }
  // ボスの怒り（HP30%以下で1度だけ攻撃力アップ）
  if (e.isBoss && !e.enraged && e.hp <= e.maxHp * 0.3) {
    e.enraged = true; e.atk = Math.round(e.atk * 1.4);
    fx('🔥'); logMsg(`${e.name} は怒り狂った！ 攻撃力が上がった！`, 'sys');
  }

  const targets = aliveAllies();
  if (targets.length === 0) { loseBattle(); return; }

  // 行動選択：通常敵は攻撃のみ。ボスは特殊行動を持つ。
  const move = e.isBoss ? pickBossMove(e) : (Math.random() < e.heavyRate ? 'heavy' : 'attack');

  switch (move) {
    case 'attack':  fx('👊'); enemyHitAlly(pick(targets), 1.0, 'こうげき'); break;
    case 'heavy':   fx('💢'); enemyHitAlly(pick(targets), 1.7, '強烈なこうげき'); break;
    case 'all': {
      fx('💥');
      logMsg(`${e.name} の全体攻撃！`, 'dmg');
      targets.slice().forEach(t => enemyHitAlly(t, 0.85, '全体攻撃'));
      break;
    }
    case 'heal': {
      const h = Math.round(e.maxHp * 0.15);
      e.hp = Math.min(e.maxHp, e.hp + h);
      fx('💚'); popNumber(document.getElementById('enemy-figure'), '+' + h, 'pop-heal');
      logMsg(`${e.name} は自分のキズを癒した！（+${h}）`, 'sys');
      renderEnemyHp();
      break;
    }
    case 'poison': {
      const t = pick(targets);
      fx('🟣'); enemyHitAlly(t, 0.8, '毒のいちげき');
      if (t.hp > 0) { t.status.poison = Math.max(t.status.poison, 3); logMsg(`${t.name} は毒におかされた！`, 'sys'); }
      break;
    }
    case 'paralyze': {
      const t = pick(targets);
      fx('✨'); enemyHitAlly(t, 0.8, 'しびれのいちげき');
      if (t.hp > 0) { t.status.paralyze = Math.max(t.status.paralyze, 2); logMsg(`${t.name} はしびれてしまった！`, 'sys'); }
      break;
    }
  }

  renderPartyPanel();

  // 敗北判定
  if (aliveAllies().length === 0) {
    setTimeout(loseBattle, 800);
    return;
  }
  // 次のラウンドへ
  setTimeout(startRound, 900);
}

// ボスの行動を重み付きで選ぶ
function pickBossMove(e) {
  const table = [
    { m: 'attack',   w: 32 },
    { m: 'heavy',    w: 20 },
    { m: 'all',      w: 16 },
    { m: 'poison',   w: 10 },
    { m: 'paralyze', w: 10 },
    { m: 'heal',     w: e.hp < e.maxHp * 0.5 ? 14 : 4 }, // HPが減ると回復しやすい
  ];
  let total = 0; table.forEach(t => total += t.w);
  let roll = Math.random() * total;
  for (const t of table) { roll -= t.w; if (roll <= 0) return t.m; }
  return 'attack';
}

// ---- 勝敗 ----------------------------------------------------
function winBattle() {
  BATTLE.over = true;
  const stage = BATTLE.stage;
  logMsg(`${BATTLE.enemy.name} をたおした！`, 'sys');
  fx('🎉');

  // 撃破回数を加算
  GAME.stageProgress[stage] = stageWins(stage) + 1;

  // どうぐ獲得
  const drops = gainItemsAfterWin(stage);
  logMsg(`どうぐを手に入れた：${drops.join('、')}`, 'heal');

  const need = winsRequired(stage);
  const wins = stageWins(stage);
  if (wins >= need) {
    if (!GAME.clearedStages.includes(stage)) GAME.clearedStages.push(stage);
    logMsg(`ステージ ${stage} クリア！ 次のステージが解放された。`, 'sys');
  } else {
    logMsg(`このステージはあと ${need - wins} 回撃破で次へ進める。（撃破 ${wins}/${need}）`, 'sys');
  }
  saveGame();
  setTimeout(() => openGacha(stage), 1100);
}

function loseBattle() {
  BATTLE.over = true;
  logMsg('パーティは全滅した……', 'sys');
  saveGame();
  const cmd = document.getElementById('command-window');
  cmd.innerHTML = `<div class="cmd-title">ゲームオーバー</div>
    <div class="cmd-grid one">
      <button class="cmd-btn" id="lose-retry">もう一度たたかう</button>
      <button class="cmd-btn" id="lose-back">ステージ選択へ</button>
    </div>`;
  document.getElementById('lose-retry').onclick = () => startBattle(BATTLE.stage);
  document.getElementById('lose-back').onclick = openStageSelect;
}

/* ============================================================
   9. 戦闘UI描画
   ============================================================ */
function hpColor(ratio) {
  if (ratio > 0.5) return 'var(--hp-good)';
  if (ratio > 0.2) return 'var(--hp-mid)';
  return 'var(--hp-low)';
}

function renderEnemyHp() {
  const e = BATTLE.enemy;
  const ratio = e.hp / e.maxHp;
  const fill = document.getElementById('enemy-hp-fill');
  fill.style.width = (ratio * 100) + '%';
  fill.style.background = hpColor(ratio);
  document.getElementById('enemy-hp-text').textContent = `HP ${e.hp} / ${e.maxHp}`;
  // 弱点・状態異常タグ
  const tags = document.getElementById('enemy-tags');
  if (tags) {
    let html = '';
    if (e.weak) html += `<span class="tag-weak">弱点 ${ELEMENT_ICON[e.weak]}${ELEMENT_NAME[e.weak]}</span>`;
    html += statusIcons(e);
    tags.innerHTML = html;
  }
}

function renderPartyPanel() {
  const panel = document.getElementById('party-panel');
  panel.innerHTML = '';
  GAME.party.forEach(c => {
    const ratio = c.hp / c.maxHp;
    const active = BATTLE && BATTLE.currentAlly === c && c.hp > 0;
    const card = document.createElement('div');
    card.className = 'ally-card' + (c.hp <= 0 ? ' dead' : '') + (active ? ' active' : '');
    card.dataset.id = c.id;
    card.innerHTML = `
      <div class="ally-top">
        <span class="ally-name">${c.name}</span>
        <span class="ally-rarity ${rarityClass(c.rarity)}">★${c.rarity}</span>
      </div>
      <div class="ally-lv">Lv.${c.level} <span class="ally-status">${c.hp > 0 ? statusIcons(c) : ''}</span></div>
      <div class="ally-hp-row"><span>HP</span><span>${c.hp}/${c.maxHp}</span></div>
      <div class="hp-bar"><div class="hp-bar-fill" style="width:${ratio*100}%;background:${hpColor(ratio)}"></div></div>
      <div class="ally-mp-row">MP ${c.mp}/${c.maxMp}</div>`;
    panel.appendChild(card);
  });
}

function logMsg(text, cls) {
  const win = document.getElementById('message-window');
  const line = document.createElement('div');
  line.className = 'msg-line' + (cls ? ' msg-' + cls : '');
  line.textContent = text;
  win.appendChild(line);
  win.scrollTop = win.scrollHeight;
}

function fx(symbol) {
  const el = document.getElementById('battle-fx');
  el.textContent = symbol;
  el.classList.remove('fx-pop');
  void el.offsetWidth; // リフロー
  el.classList.add('fx-pop');
}

function shakeEnemy() {
  const el = document.getElementById('enemy-figure');
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

// 戦闘パネル上の味方カード要素を取得
function allyCardEl(c) {
  return document.querySelector(`.ally-card[data-id="${c.id}"]`);
}

// ダメージ/回復の数字を対象の上にポップアップ表示する
function popNumber(targetEl, text, cls) {
  if (!targetEl) return;
  const rect = targetEl.getBoundingClientRect();
  const pop = document.createElement('div');
  pop.className = 'dmg-pop ' + (cls || '');
  pop.textContent = text;
  pop.style.left = (rect.left + rect.width / 2) + 'px';
  pop.style.top = (rect.top + rect.height * 0.3) + 'px';
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 900);
}

/* ============================================================
   10. ガチャ（仲間獲得）
   ============================================================ */
let GACHA_NEW = null;

function openGacha(stage) {
  const [rmin, rmax] = gachaRarityRange(stage);
  const rarity = weightedRarity(rmin, rmax);
  // レベルはステージに応じてゆるく上昇
  const lvl = clamp(1 + Math.floor(stage / 4), 1, 10);
  GACHA_NEW = createCharacter(rarity, rand(1, lvl), GAME.party.map(c => c.name));

  renderGachaCard();
  renderGachaParty(false);
  renderGachaActions();
  showScreen('gacha');
}

// キャラクターの「総合力」スコア（入れ替え判断の目安）
function powerScore(c) {
  const sk = c.skills.reduce((s, sn) => s + skillByName(sn).minRarity * 4, 0);
  return Math.round(c.maxHp + c.atk * 4 + c.def * 3 + c.spd * 2 + c.maxMp + c.rarity * 8 + sk);
}

function renderGachaCard() {
  const c = GACHA_NEW;
  const el = document.getElementById('gacha-card');
  el.innerHTML = `
    <div class="gc-name">${c.name}</div>
    <div class="gc-rarity ${rarityClass(c.rarity)}">★ レア度 ${c.rarity} ／ Lv.${c.level}</div>
    <div class="gc-power">総合力 <b>${powerScore(c)}</b></div>
    <div class="gc-stats">
      HP ${c.maxHp} ・ MP ${c.maxMp}<br>
      攻撃 ${c.atk} ・ 防御 ${c.def} ・ 素早さ ${c.spd}
    </div>
    <div class="gc-skills">スキル: ${c.skills.join(' / ')}</div>`;
}

// 現在のパーティを新キャラと比較表示する。choosing=true で入れ替え対象として選択可能。
function renderGachaParty(choosing) {
  const newScore = powerScore(GACHA_NEW);
  const partyEl = document.getElementById('gacha-party');
  partyEl.className = 'gacha-party' + (choosing ? ' choosing' : '');
  partyEl.innerHTML = '';
  GAME.party.forEach((c, i) => {
    const score = powerScore(c);
    const diff = newScore - score; // プラスなら新キャラの方が強い
    const arrow = diff > 0 ? `<span class="sc-up">▲+${diff}</span>`
      : diff < 0 ? `<span class="sc-down">▼${diff}</span>`
      : `<span class="sc-eq">±0</span>`;
    const card = document.createElement('div');
    card.className = 'swap-card' + (choosing && diff > 0 ? ' better' : '');
    card.innerHTML = `
      <div class="sc-name">${c.name}</div>
      <div class="sc-meta"><span class="${rarityClass(c.rarity)}">★${c.rarity}</span> Lv.${c.level}<br>
        HP ${c.maxHp} ・ 攻 ${c.atk} ・ 防 ${c.def}</div>
      <div class="sc-power">総合力 ${score} ${arrow}</div>
      ${choosing ? '<div class="sc-action">この仲間と交代</div>' : ''}`;
    if (choosing) {
      card.onclick = () => {
        const old = GAME.party[i];
        GAME.party[i] = GACHA_NEW;
        finishGacha(`${old.name}（総合力${score}）と入れ替えて ${GACHA_NEW.name}（総合力${newScore}）が加入した！`);
      };
    }
    partyEl.appendChild(card);
  });
}

function renderGachaActions() {
  const el = document.getElementById('gacha-actions');
  renderGachaParty(false);
  // パーティが4人未満ならそのまま加入できる
  if (GAME.party.length < 4) {
    el.innerHTML = `
      <button class="btn btn-primary" id="g-join">仲間にする（加入）</button>
      <button class="btn" id="g-bye">さよならする</button>`;
    document.getElementById('g-join').onclick = () => {
      GAME.party.push(GACHA_NEW);
      finishGacha('仲間が加入した！');
    };
  } else {
    el.innerHTML = `
      <button class="btn btn-primary" id="g-swap">入れ替える</button>
      <button class="btn" id="g-bye">さよならする</button>`;
    document.getElementById('g-swap').onclick = beginSwap;
  }
  document.getElementById('g-bye').onclick = () =>
    finishGacha(`${GACHA_NEW.name} とはここでお別れだ……`);
}

// 入れ替え対象を選ぶ
function beginSwap() {
  const actions = document.getElementById('gacha-actions');
  actions.innerHTML = `<p class="gacha-hint">入れ替える仲間を選んでください（クリック）</p>
    <button class="btn" id="g-cancel">やめる</button>`;
  document.getElementById('g-cancel').onclick = renderGachaActions;
  renderGachaParty(true);
}

function finishGacha(message) {
  saveGame();
  alert(message);
  openStageSelect();
}

/* ============================================================
   11. 起動
   ============================================================ */
window.addEventListener('DOMContentLoaded', initTitle);
