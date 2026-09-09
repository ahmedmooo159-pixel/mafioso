// ============================================================
// main.js — Router + منطق الشاشات الكاملة
// ============================================================

// ============================================================
// Router
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + id);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ============================================================
// Toast
// ============================================================
function showToast(msg, duration = 2500) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ============================================================
// Utility
// ============================================================
function getRoleColor(role) {
  const colors = {
    mafioso: '#c0392b',
    detective: '#2471a3',
    false_witness: '#8e44ad',
    secret_ally: '#d35400',
    innocent: '#27ae60'
  };
  return colors[role] || '#27ae60';
}

function getRoleEmoji(role) {
  return { mafioso: '🔴', detective: '🕵️', false_witness: '🙈', secret_ally: '🤝', innocent: '✅' }[role] || '✅';
}

function getRoleLabel(role) {
  return { mafioso: 'المافيوسو', detective: 'المحقق', false_witness: 'الشاهد الكاذب', secret_ally: 'الحليف السري', innocent: 'بريء' }[role] || 'بريء';
}

function getAccusationEmoji(acc) {
  return { قتل: '🔪', سرقة: '💰', نصب: '🎭', اختلاس: '💼', تزوير: '📄' }[acc] || '🔍';
}

// ============================================================
// Setup Screen
// ============================================================
let playerCount = 5;

function initSetupScreen() {
  playerCount = 5;
  updatePlayerCount(5);
  
  document.getElementById('btn-decrease').onclick = () => updatePlayerCount(playerCount - 1);
  document.getElementById('btn-increase').onclick = () => updatePlayerCount(playerCount + 1);
  
  document.getElementById('btn-start-game').onclick = startGame;
}

function updatePlayerCount(n) {
  n = Math.max(5, Math.min(10, n));
  playerCount = n;
  document.getElementById('count-display').textContent = n;
  document.getElementById('btn-decrease').disabled = n <= 5;
  document.getElementById('btn-increase').disabled = n >= 10;
  
  // مافيوسو count hint
  const mafCount = n >= 8 ? 2 : 1;
  document.getElementById('mafioso-hint').textContent = 
    `${mafCount} مافيوسو${mafCount === 2 ? ' (لأن اللاعبين 8+)' : ''}`;
  
  renderPlayerInputs(n);
}

function renderPlayerInputs(n) {
  const container = document.getElementById('player-inputs');
  container.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const row = document.createElement('div');
    row.className = 'player-input-row';
    row.innerHTML = `
      <div class="player-number">${i + 1}</div>
      <input 
        type="text" 
        class="form-input player-name-input" 
        placeholder="اسم اللاعب ${i + 1}"
        id="player-input-${i}"
        maxlength="20"
        autocomplete="off"
      >
    `;
    container.appendChild(row);
  }
}

function startGame() {
  const inputs = document.querySelectorAll('.player-name-input');
  const names = Array.from(inputs).map(i => i.value.trim());
  
  const empty = names.findIndex(n => !n);
  if (empty !== -1) {
    showToast(`⚠️ ادخل اسم اللاعب ${empty + 1}`);
    document.getElementById(`player-input-${empty}`).focus();
    return;
  }
  
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  if (duplicates.length > 0) {
    showToast(`⚠️ في أسامي متكررة: ${duplicates[0]}`);
    return;
  }
  
  const specialRoles = document.getElementById('toggle-special-roles').checked;
  const timerEnabled = document.getElementById('toggle-timer').checked;
  const timerDuration = parseInt(document.getElementById('timer-duration')?.value || '300');
  
  Sounds.playTick();
  GameState.init(names, specialRoles, timerEnabled, timerDuration);
  renderScenarioScreen();
  showScreen('scenario');
}

// ============================================================
// Scenario Screen
// ============================================================
function renderScenarioScreen() {
  const state = GameState.get();
  const s = state.scenario;
  const acc = state.accusation;
  
  document.getElementById('scenario-accusation-badge').innerHTML =
    `${getAccusationEmoji(acc)} تهمة ${acc}`;
  document.getElementById('scenario-title').textContent = `"${s.title}"`;
  document.getElementById('scenario-story').textContent = s.story;
  
  document.getElementById('btn-start-reveal').onclick = () => {
    GameState.startReveal();
    renderRevealTransition();
    showScreen('reveal-transition');
  };
}

// ============================================================
// Reveal Screens
// ============================================================
function renderRevealTransition() {
  const state = GameState.get();
  const idx = state.revealIndex;

  if (GameState.isRevealComplete() || idx >= state.players.length) {
    renderDiscussionScreen();
    showScreen('discussion');
    return;
  }

  const player = state.players[idx];
  if (!player) {
    renderDiscussionScreen();
    showScreen('discussion');
    return;
  }
  
  document.getElementById('next-player-name').textContent = player.name;
  
  // Dots
  const dotsContainer = document.getElementById('reveal-dots');
  dotsContainer.innerHTML = '';
  state.players.forEach((p, i) => {
    const dot = document.createElement('div');
    dot.className = 'reveal-dot' + (i < idx ? ' done' : i === idx ? ' current' : '');
    dotsContainer.appendChild(dot);
  });
  
  document.getElementById('btn-show-role').textContent = `أنا ${player.name}، عايز أشوف دوري`;
  document.getElementById('btn-show-role').onclick = () => {
    Sounds.playReveal();
    renderRevealScreen(player, state);
    showScreen('reveal');
  };
}

function renderRevealScreen(player, state) {
  const role = player.role;
  const color = getRoleColor(role);
  const info = ROLE_INFO[role];
  
  // بناء المحتوى
  document.getElementById('reveal-player-title').textContent = `دور: ${player.name}`;
  
  const roleCard = document.getElementById('role-card');
  roleCard.style.background = `linear-gradient(135deg, ${color}30 0%, ${color}10 100%)`;
  roleCard.style.border = `2px solid ${color}60`;
  
  document.getElementById('reveal-role-emoji').textContent = info.emoji;
  document.getElementById('reveal-role-title').textContent = info.label;
  document.getElementById('reveal-role-title').style.color = color;
  document.getElementById('reveal-story-role').textContent = `دورك في القصة: ${player.storyRole}`;
  document.getElementById('reveal-role-hint').textContent = info.hint;
  
  // لو شاهد كاذب — أضف المعلومة المشوّشة
  const falseWitnessInfo = document.getElementById('false-witness-info');
  if (role === ROLE_TYPES.FALSE_WITNESS && player.falseTargetName) {
    falseWitnessInfo.style.display = 'block';
    document.getElementById('false-target-name').textContent = player.falseTargetName;
  } else {
    falseWitnessInfo.style.display = 'none';
  }
  
  // لو مافيوسو وفي شريك
  const mafiosoAllyInfo = document.getElementById('mafioso-ally-info');
  if (role === ROLE_TYPES.MAFIOSO && state.mafiosoCount > 1) {
    const partners = state.mafiosoIds
      .filter(id => id !== player.id)
      .map(id => GameState.getPlayer(id)?.name)
      .filter(Boolean);
    if (partners.length > 0) {
      mafiosoAllyInfo.style.display = 'block';
      document.getElementById('mafioso-partner-name').textContent = partners.join('، ');
    } else {
      mafiosoAllyInfo.style.display = 'none';
    }
  } else if (role === ROLE_TYPES.MAFIOSO && player.knowsAllyId) {
    const ally = GameState.getPlayer(player.knowsAllyId);
    if (ally) {
      mafiosoAllyInfo.style.display = 'block';
      document.getElementById('mafioso-partner-name').textContent = `${ally.name} (حليفك السري)`;
    }
  } else if (role === ROLE_TYPES.SECRET_ALLY && player.knowsAllyId) {
    const maf = GameState.getPlayer(player.knowsAllyId);
    if (maf) {
      mafiosoAllyInfo.style.display = 'block';
      mafiosoAllyInfo.style.background = 'rgba(211,84,0,0.15)';
      mafiosoAllyInfo.style.borderColor = 'rgba(211,84,0,0.4)';
      document.getElementById('mafioso-partner-name').textContent = `${maf.name} هو المافيوسو — ساعده بذكاء!`;
    }
  } else {
    mafiosoAllyInfo.style.display = 'none';
  }
  
  document.getElementById('btn-done-reveal').onclick = () => {
    GameState.advanceReveal();
    if (GameState.isRevealComplete()) {
      renderDiscussionScreen();
      showScreen('discussion');
    } else {
      renderRevealTransition();
      showScreen('reveal-transition');
    }
  };
}

// ============================================================
// Discussion Screen
// ============================================================
let discussionTimer = null;
let discussionTimeLeft = 0;
function renderDiscussionPlayerList(alive, clue) {
  const listEl = document.getElementById('discussion-player-list');
  if (!listEl) return;
  listEl.innerHTML = alive.map((p, i) => {
    const isStarter = clue && p.id === clue.targetPlayerId;
    return `
      <div class="player-order-item" style="${isStarter ? 'border-color: var(--gold); background: rgba(201,162,39,0.12); box-shadow: 0 0 10px rgba(201,162,39,0.2);' : ''}">
        <div class="player-num" style="${isStarter ? 'background: var(--gold); color: #1A1000; font-weight: 900;' : ''}">${i + 1}</div>
        <span>${p.name} ${isStarter ? '<span style="color:var(--gold-light);font-size:0.8rem;margin-right:6px;font-weight:700;">🎙️ يبدأ الدفاع</span>' : ''}</span>
        <span style="color: var(--text-muted); font-size: 0.8rem; margin-right: auto;">${p.storyRole}</span>
      </div>
    `;
  }).join('');
}

function renderDiscussionScreen() {
  const state = GameState.get();
  const alive = GameState.getAlivePlayers();
  
  document.getElementById('discussion-round-badge').textContent = `الجولة ${state.currentRound}`;
  document.getElementById('discussion-alive-count').innerHTML = 
    `لاعبين أحياء: <span>${alive.length}</span>`;

  // خيط ودليل بداية النقاش
  const clue = GameState.getDiscussionClue();
  if (clue) {
    document.getElementById('discussion-clue-text').textContent = clue.clueText;
    document.getElementById('starter-speaker-name').textContent = `${clue.targetPlayerName} (${clue.storyRole})`;
  }

  // زر تغيير الدليل
  document.getElementById('btn-reroll-clue').onclick = () => {
    Sounds.playTick();
    const newClue = GameState.generateDiscussionClue();
    if (newClue) {
      document.getElementById('discussion-clue-text').textContent = newClue.clueText;
      document.getElementById('starter-speaker-name').textContent = `${newClue.targetPlayerName} (${newClue.storyRole})`;
      showToast('🔄 تم سحب دليل جديد وبداية جديدة!');
      // إعادة تحديث القائمة لإبراز اللاعب الجديد
      renderDiscussionPlayerList(alive, newClue);
    }
  };
  
  // قائمة اللاعبين الأحياء مع تمييز من يبدأ الدفاع
  renderDiscussionPlayerList(alive, clue);
  
  // Timer
  const timerSection = document.getElementById('timer-section');
  if (state.discussionTimerEnabled) {
    timerSection.style.display = 'block';
    discussionTimeLeft = state.discussionDuration;
    updateTimerDisplay(discussionTimeLeft);
    startDiscussionTimer();
  } else {
    timerSection.style.display = 'none';
  }
  
  document.getElementById('btn-go-to-vote').onclick = () => {
    stopDiscussionTimer();
    renderVotingScreen();
    showScreen('voting');
  };
  
  document.getElementById('btn-skip-timer').onclick = () => {
    stopDiscussionTimer();
    renderVotingScreen();
    showScreen('voting');
  };
}

function startDiscussionTimer() {
  stopDiscussionTimer();
  discussionTimer = setInterval(() => {
    discussionTimeLeft--;
    updateTimerDisplay(discussionTimeLeft);
    if (discussionTimeLeft <= 0) {
      stopDiscussionTimer();
      renderVotingScreen();
      showScreen('voting');
      showToast('⏰ الوقت خلص! ابدأوا التصويت');
    }
  }, 1000);
}

function stopDiscussionTimer() {
  if (discussionTimer) {
    clearInterval(discussionTimer);
    discussionTimer = null;
  }
}

function updateTimerDisplay(seconds) {
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  const display = document.getElementById('timer-display');
  if (display) {
    display.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    display.classList.toggle('warning', seconds <= 30);
  }
}

// ============================================================
// Voting Screen
// ============================================================
let currentVotes = {}; // { playerId: voteCount } — عرض مؤقت

function renderVotingScreen() {
  const state = GameState.get();
  const alive = GameState.getAlivePlayers();
  
  document.getElementById('voting-round-label').textContent = `الجولة ${state.currentRound}`;
  document.getElementById('voting-alive-count').textContent = alive.length;
  
  currentVotes = {};
  alive.forEach(p => { currentVotes[p.id] = 0; });
  
  renderVoteButtons(alive);
  
  // Detective section
  const detectivePlayer = state.detectiveId ? GameState.getPlayer(state.detectiveId) : null;
  const isDetective = detectivePlayer && detectivePlayer.isAlive && !state.detectorUsed[state.currentRound];
  const detectiveSection = document.getElementById('detective-section');
  if (isDetective) {
    detectiveSection.style.display = 'block';
    renderDetectiveSection(alive, state);
  } else {
    detectiveSection.style.display = 'none';
  }
  
  document.getElementById('btn-confirm-votes').onclick = confirmVotes;
}

function renderVoteButtons(alive) {
  const container = document.getElementById('vote-buttons-container');
  container.innerHTML = alive.map(p => `
    <button class="vote-player-btn" data-id="${p.id}" onclick="toggleVote('${p.id}')">
      <span>${p.name} <small style="color:var(--text-muted);font-weight:400;">(${p.storyRole})</small></span>
      <div class="vote-count-badge" id="vote-badge-${p.id}">0</div>
    </button>
  `).join('');
}

function toggleVote(playerId) {
  // نظام بسيط: ضغط على اللاعب يزيد صوته بواحد (الهوست بيسجل)
  currentVotes[playerId] = (currentVotes[playerId] || 0) + 1;
  
  const badge = document.getElementById(`vote-badge-${playerId}`);
  if (badge) {
    badge.textContent = currentVotes[playerId];
    badge.parentElement.classList.toggle('selected', currentVotes[playerId] > 0);
  }
  
  Sounds.playTick();
}

function renderDetectiveSection(alive, state) {
  const select = document.getElementById('detective-target-select');
  if (!select) return;
  select.innerHTML = '<option value="">-- اختار لاعب --</option>' +
    alive.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  
  document.getElementById('btn-detective-check').onclick = () => {
    const targetId = select.value;
    if (!targetId) { showToast('اختار لاعب تحقق منه'); return; }
    const result = GameState.useDetectorAbility(targetId);
    if (result) {
      const resultEl = document.getElementById('detective-result');
      resultEl.style.display = 'block';
      resultEl.className = `detective-result ${result.isMafioso ? 'mafioso' : 'innocent'}`;
      resultEl.textContent = result.isMafioso 
        ? `🚨 ${result.targetName} هو المافيوسو!` 
        : `✅ ${result.targetName} بريء`;
      document.getElementById('detective-section').style.display = 'block';
    }
  };
}

function confirmVotes() {
  const totalVotes = Object.values(currentVotes).reduce((a, b) => a + b, 0);
  if (totalVotes === 0) {
    showToast('⚠️ لازم تسجّل أصوات الأول!');
    return;
  }
  
  // تسجيل الأصوات في الـ state
  const state = GameState.get();
  const alive = GameState.getAlivePlayers();
  alive.forEach(p => {
    const count = currentVotes[p.id] || 0;
    for (let v = 0; v < count; v++) {
      GameState.registerVote(`auto_${p.id}_${v}`, p.id);
    }
  });
  
  // اكتشاف من أخد أكتر أصوات
  const leader = GameState.getVoteLeader();
  if (!leader || leader.isTie || !leader.playerId) {
    showToast('⚠️ في تعادل في الأصوات! صوّتوا تاني أو اتفقوا على صوت حاسم');
    return;
  }
  
  Sounds.playSuspense();
  setTimeout(() => {
    renderEliminationScreen(leader.playerId);
    showScreen('elimination');
  }, 1500);
}

// ============================================================
// Elimination Screen
// ============================================================
function renderEliminationScreen(playerId) {
  const player = GameState.eliminatePlayer(playerId);
  if (!player) return;
  
  Sounds.playElimination();
  
  document.getElementById('eliminated-name').textContent = player.name;
  document.getElementById('eliminated-story-role').textContent = player.storyRole;
  
  const isMafioso = GameState.get().mafiosoIds.includes(player.id);
  document.getElementById('eliminated-mafioso-reveal').style.display = 
    isMafioso ? 'block' : 'none';
  
  const clue = GameState.get().currentEliminatedClue;
  document.getElementById('elimination-clue-text').textContent = clue;
  
  // زر التالي
  document.getElementById('btn-after-elimination').onclick = afterElimination;
}

function afterElimination() {
  const aliveCount = GameState.getAliveCount();
  
  if (aliveCount <= 2) {
    renderFinalVoteScreen();
    showScreen('final-vote');
  } else {
    GameState.advanceRound();
    const state = GameState.get();
    
    if (state.status === 'twist') {
      renderTwistScreen();
      showScreen('twist');
    } else if (state.status === 'final_vote') {
      renderFinalVoteScreen();
      showScreen('final-vote');
    } else {
      renderDiscussionScreen();
      showScreen('discussion');
    }
  }
}

// ============================================================
// Twist Screen
// ============================================================
function renderTwistScreen() {
  const state = GameState.get();
  document.getElementById('twist-text').textContent = state.twistText || '';
  Sounds.playTwist();
  
  document.getElementById('btn-after-twist').onclick = () => {
    renderDiscussionScreen();
    showScreen('discussion');
  };
}

// ============================================================
// Final Vote Screen
// ============================================================
let finalVoteCurrentIdx = 0;
let finalVoteVoters = [];

function renderFinalVoteScreen() {
  Sounds.playFinalRound();
  
  const state = GameState.get();
  const alive = GameState.getAlivePlayers();
  const eliminated = GameState.getEliminatedPlayers();
  
  // الناخبون = اللاعبين المقصّين
  finalVoteVoters = eliminated;
  finalVoteCurrentIdx = 0;
  
  // المرشّحان
  document.getElementById('final-candidate-1-name').textContent = alive[0]?.name || '؟';
  document.getElementById('final-candidate-1-role').textContent = alive[0]?.storyRole || '';
  document.getElementById('final-candidate-2-name').textContent = alive[1]?.name || '؟';
  document.getElementById('final-candidate-2-role').textContent = alive[1]?.storyRole || '';
  
  document.getElementById('final-candidate-1').dataset.id = alive[0]?.id || '';
  document.getElementById('final-candidate-2').dataset.id = alive[1]?.id || '';
  
  document.getElementById('final-candidate-1').onclick = () => selectFinalCandidate(alive[0]?.id);
  document.getElementById('final-candidate-2').onclick = () => selectFinalCandidate(alive[1]?.id);
  
  updateFinalVoteUI();
  
  document.getElementById('btn-confirm-final-vote').onclick = confirmFinalVote;
  document.getElementById('btn-skip-final-vote').onclick = skipToResults;
}

let selectedFinalCandidate = null;

function selectFinalCandidate(id) {
  selectedFinalCandidate = id;
  document.getElementById('final-candidate-1').classList.toggle('selected', 
    document.getElementById('final-candidate-1').dataset.id === id);
  document.getElementById('final-candidate-2').classList.toggle('selected', 
    document.getElementById('final-candidate-2').dataset.id === id);
  Sounds.playTick();
}

function updateFinalVoteUI() {
  const voter = finalVoteVoters[finalVoteCurrentIdx];
  const total = finalVoteVoters.length;
  
  if (voter) {
    document.getElementById('final-voter-name').textContent = `دور: ${voter.name}`;
    document.getElementById('final-vote-progress').textContent = 
      `${finalVoteCurrentIdx + 1} من ${total} لاعب`;
  }
  
  selectedFinalCandidate = null;
  document.getElementById('final-candidate-1').classList.remove('selected');
  document.getElementById('final-candidate-2').classList.remove('selected');
  
  // تحديث عداد الأصوات
  updateFinalTally();
}

function updateFinalTally() {
  const state = GameState.get();
  const tally = GameState.countFinalVotes();
  const alive = GameState.getAlivePlayers();
  
  const count1 = tally[alive[0]?.id] || 0;
  const count2 = tally[alive[1]?.id] || 0;
  
  document.getElementById('final-tally-1').textContent = count1;
  document.getElementById('final-tally-2').textContent = count2;
  document.getElementById('final-tally-name-1').textContent = alive[0]?.name || '';
  document.getElementById('final-tally-name-2').textContent = alive[1]?.name || '';
}

function confirmFinalVote() {
  if (!selectedFinalCandidate) {
    showToast('⚠️ اختار مين تعتقد إنه المافيوسو!');
    return;
  }
  
  const voter = finalVoteVoters[finalVoteCurrentIdx];
  if (voter) {
    GameState.registerFinalVote(voter.id, selectedFinalCandidate);
  }
  
  Sounds.playTick();
  finalVoteCurrentIdx++;
  
  if (finalVoteCurrentIdx >= finalVoteVoters.length) {
    // خلصت الأصوات
    renderResultsScreen();
    showScreen('results');
  } else {
    updateFinalVoteUI();
  }
}

function skipToResults() {
  renderResultsScreen();
  showScreen('results');
}

// ============================================================
// Results Screen
// ============================================================
function renderResultsScreen() {
  const result = GameState.endGame();
  const state = GameState.get();
  
  const innocentsWin = result.innocentsWin;
  
  // Banner
  const banner = document.getElementById('results-banner');
  banner.className = `results-banner ${innocentsWin ? 'innocents-win' : 'mafioso-wins'}`;
  document.getElementById('results-emoji').textContent = innocentsWin ? '🎉' : '😈';
  document.getElementById('results-headline').textContent = 
    innocentsWin ? 'الأبرياء كسبوا! 🏆' : 'المافيوسو كسب! 😈';
  document.getElementById('results-subline').textContent = innocentsWin
    ? `كشفتم المافيوسو الحقيقي: ${result.mafiosoNames.join('، ')}`
    : `المافيوسو ${result.mafiosoNames.join('، ')} نجح في الهروب!`;
  
  innocentsWin ? Sounds.playWin() : Sounds.playLose();
  
  // كشف الأدوار
  const rolesContainer = document.getElementById('roles-reveal-list');
  rolesContainer.innerHTML = state.players.map(p => {
    const color = getRoleColor(p.role);
    const emoji = getRoleEmoji(p.role);
    const label = getRoleLabel(p.role);
    return `
      <div class="role-reveal-item">
        <div>
          <div class="role-reveal-name">${p.name}</div>
          <div class="role-reveal-story">${p.storyRole}</div>
        </div>
        <div class="role-reveal-badge" style="background:${color}25;color:${color};border:1px solid ${color}60;">
          ${emoji} ${label}
        </div>
      </div>
    `;
  }).join('');
  
  // نتيجة التصويت النهائي
  const tally = GameState.countFinalVotes();
  const alive = GameState.getAlivePlayers().concat(
    state.players.filter(p => p.isEliminated && tally[p.id] !== undefined)
  );
  const accusedPlayer = GameState.getPlayer(result.accusedId);
  document.getElementById('results-accused-name').textContent = 
    accusedPlayer ? `${accusedPlayer.name} (${accusedPlayer.storyRole})` : '؟';
  
  document.getElementById('btn-play-again').onclick = () => {
    showScreen('setup');
    initSetupScreen();
  };
  
  document.getElementById('btn-view-stats-from-results').onclick = () => {
    renderStatsScreen();
    showScreen('stats');
  };
}

// ============================================================
// Stats Screen
// ============================================================
function renderStatsScreen() {
  const stats = GameState.loadStats();
  
  // Summary cards
  document.getElementById('stat-total-games').textContent = stats.totalGames;
  
  const innocentWins = stats.sessions.filter(s => s.winner === 'الأبرياء').length;
  const mafiosoWins = stats.sessions.filter(s => s.winner === 'المافيوسو').length;
  document.getElementById('stat-innocent-wins').textContent = innocentWins;
  document.getElementById('stat-mafioso-wins').textContent = mafiosoWins;
  
  // أكتر لاعب فاز كمافيوسو
  let topMafioso = 'لا يوجد';
  let topWins = 0;
  Object.entries(stats.playerStats || {}).forEach(([name, ps]) => {
    if (ps.winsAsMafioso > topWins) {
      topWins = ps.winsAsMafioso;
      topMafioso = name;
    }
  });
  document.getElementById('stat-top-mafioso').textContent = topWins > 0 ? `${topMafioso} (${topWins} 🏆)` : 'لا يوجد';
  
  // Sessions
  const sessionsContainer = document.getElementById('sessions-list');
  if (stats.sessions.length === 0) {
    sessionsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>مفيش جلسات سابقة لحد دلوقتي</p>
      </div>
    `;
  } else {
    sessionsContainer.innerHTML = stats.sessions.slice(0, 20).map((s, i) => `
      <div class="session-card">
        <div class="session-header">
          <span class="session-winner ${s.winner === 'الأبرياء' ? 'innocents' : 'mafioso'}">
            ${s.winner === 'الأبرياء' ? '🏆 الأبرياء كسبوا' : '😈 المافيوسو كسب'}
          </span>
          <span class="session-date">${s.date} ${s.time}</span>
        </div>
        <div class="session-detail">
          📖 ${s.scenarioTitle} (${s.accusation})<br>
          🔴 المافيوسو: ${s.mafioso.join('، ')}
          ${s.mostVotedInnocent ? `<br>😅 أكتر واحد اتكدب عليه: ${s.mostVotedInnocent}` : ''}
          ${s.undetectedMafioso ? `<br>🎭 هرب من غير ما حد يكشفه: ${s.undetectedMafioso}` : ''}
        </div>
      </div>
    `).join('');
  }
  
  // Player stats table
  const playerStatsContainer = document.getElementById('player-stats-table-container');
  const entries = Object.entries(stats.playerStats || {});
  if (entries.length === 0) {
    playerStatsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👤</div>
        <p>مفيش إحصائيات لاعبين بعد</p>
      </div>
    `;
  } else {
    const sorted = entries.sort((a, b) => b[1].gamesTotal - a[1].gamesTotal);
    playerStatsContainer.innerHTML = `
      <div style="overflow-x:auto;">
        <table class="player-stats-table">
          <thead>
            <tr>
              <th>اللاعب</th>
              <th>لعب</th>
              <th>مافيوسو</th>
              <th>فاز كـمافيوسو</th>
              <th>اتقصى</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(([name, ps]) => `
              <tr>
                <td class="player-name-cell">${name}</td>
                <td>${ps.gamesTotal}</td>
                <td>${ps.gamesAsMafioso}</td>
                <td>${ps.winsAsMafioso}</td>
                <td>${ps.timesVotedOut}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

// ============================================================
// Tabs
// ============================================================
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      const target = btn.dataset.tab;
      const parent = btn.closest('.tabs')?.parentElement;
      if (!parent) return;
      parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      parent.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      parent.querySelector(`.tab-content[data-tab="${target}"]`)?.classList.add('active');
    };
  });
}

// ============================================================
// Sound Toggle
// ============================================================
function initSoundToggle() {
  const btn = document.getElementById('sound-toggle');
  if (!btn) return;
  btn.onclick = () => {
    const enabled = Sounds.isEnabled();
    Sounds.setEnabled(!enabled);
    btn.textContent = enabled ? '🔇' : '🔊';
    btn.classList.toggle('muted', enabled);
    showToast(enabled ? '🔇 الصوت اتقفل' : '🔊 الصوت اتفتح');
  };
}

// ============================================================
// DOMContentLoaded — Bootstrap
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Show home screen
  showScreen('home');
  initSetupScreen();
  initTabs();
  initSoundToggle();
  
  // Home screen buttons
  document.getElementById('btn-new-game').onclick = () => showScreen('setup');
  document.getElementById('btn-view-stats').onclick = () => {
    renderStatsScreen();
    showScreen('stats');
  };
  
  // Stats screen back
  document.getElementById('btn-stats-back').onclick = () => showScreen('home');
  
  // Setup screen back
  document.getElementById('btn-setup-back').onclick = () => showScreen('home');
  
  // Scenario screen back
  document.getElementById('btn-scenario-back').onclick = () => showScreen('setup');
  
  // Timer toggle in setup
  const timerToggle = document.getElementById('toggle-timer');
  const timerDurationGroup = document.getElementById('timer-duration-group');
  if (timerToggle && timerDurationGroup) {
    timerToggle.onchange = () => {
      timerDurationGroup.style.display = timerToggle.checked ? 'block' : 'none';
    };
  }
  
  // Stats clear
  document.getElementById('btn-clear-stats')?.addEventListener('click', () => {
    if (confirm('⚠️ هتمسح كل الإحصائيات. متأكد؟')) {
      GameState.clearStats();
      renderStatsScreen();
      showToast('✅ الإحصائيات اتمسحت');
    }
  });
});
