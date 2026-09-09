// ============================================================
// gameState.js — إدارة الـ State الكامل للعبة
// ============================================================

const GameState = (() => {
  // الـ State الأساسي
  let state = createInitialState();

  function createInitialState() {
    return {
      status: 'setup',          // setup | scenario | reveal | discussion | voting | twist | eliminated_clue | final_vote | results | ended
      accusation: null,
      scenario: null,           // { id, title, story, roles: [...], assignedRoles: [...] }
      currentRound: 1,
      mafiosoCount: 1,
      specialRolesEnabled: true,
      players: [],              // [{ id, name, isAlive, role, storyRole, knowsAllyId, falseTargetName, hasSeenRole, hasVoted, isEliminated }]
      mafiosoIds: [],
      detectiveId: null,
      falseWitnessId: null,
      secretAllyId: null,
      votes: {},                // { [round]: { [voterId]: targetPlayerId } }
      eliminatedOrder: [],      // [playerId, ...]
      eliminatedThisRound: null,
      returnedVoters: [],
      midGameTwistUsed: false,
      twistText: null,
      revealIndex: 0,           // اللاعب الحالي في شاشة الـ Reveal
      discussionTimerEnabled: false,
      discussionDuration: 300,  // 5 دقايق
      detectorUsed: {},         // { [round]: playerId } — المحقق استخدم قدرته في الجولة دي؟
      detectorResults: {},      // { [round]: { targetId, isMafioso } }
      currentEliminatedClue: null,
      currentDiscussionClue: null, // دليل وخيط بداية النقاش
      finalVotes: {},           // { [voterId]: targetPlayerId } — التصويت النهائي
    };
  }

  // ============================================================
  // Initialization
  // ============================================================
  function initGame(playerNames, specialRolesEnabled, discussionTimerEnabled = false, discussionDuration = 300) {
    state = createInitialState();
    state.specialRolesEnabled = specialRolesEnabled;
    state.discussionTimerEnabled = discussionTimerEnabled;
    state.discussionDuration = discussionDuration;

    // إنشاء اللاعبين
    state.players = playerNames.map((name, i) => ({
      id: `p${i}`,
      name: name.trim(),
      isAlive: true,
      role: null,
      storyRole: null,
      knowsAllyId: null,
      falseTargetName: null,
      hasSeenRole: false,
      hasVoted: false,
      isEliminated: false,
      votesReceived: 0
    }));

    // تحديد عدد المافيوسو
    state.mafiosoCount = playerNames.length >= 8 ? 2 : 1;

    // اختيار السيناريو
    const lastUsedId = localStorage.getItem('mafioso_lastScenarioId');
    state.scenario = getScenarioForGame(playerNames.length, lastUsedId);
    state.accusation = state.scenario.accusation;
    localStorage.setItem('mafioso_lastScenarioId', state.scenario.id);

    // توزيع أدوار القصة على اللاعبين
    const assignedRoles = [...state.scenario.assignedRoles];
    state.players.forEach((p, i) => {
      p.storyRole = assignedRoles[i] || 'ضيف';
    });

    // توزيع الأدوار الوظيفية
    const { roleAssignments, mafiosoIds } = assignRoles(
      state.players,
      state.mafiosoCount,
      specialRolesEnabled
    );

    state.mafiosoIds = mafiosoIds;
    roleAssignments.forEach(({ playerId, role }) => {
      const player = state.players.find(p => p.id === playerId);
      if (player) player.role = role;
    });

    // تحديد IDs الأدوار الخاصة
    state.players.forEach(p => {
      if (p.role === ROLE_TYPES.DETECTIVE) state.detectiveId = p.id;
      if (p.role === ROLE_TYPES.FALSE_WITNESS) state.falseWitnessId = p.id;
      if (p.role === ROLE_TYPES.SECRET_ALLY) state.secretAllyId = p.id;
    });

    // معلومة الشاهد الكاذب
    if (state.falseWitnessId) {
      const target = getFalseWitnessTarget(state.players, state.falseWitnessId, state.mafiosoIds);
      if (target) {
        const falseWitness = state.players.find(p => p.id === state.falseWitnessId);
        if (falseWitness) falseWitness.falseTargetName = target.name;
      }
    }

    // لو المافيوسو عنده حليف، عرّفهم ببعض
    if (state.secretAllyId && state.mafiosoIds.length === 1) {
      const mafioso = state.players.find(p => p.id === state.mafiosoIds[0]);
      const ally = state.players.find(p => p.id === state.secretAllyId);
      if (mafioso) mafioso.knowsAllyId = state.secretAllyId;
      if (ally) ally.knowsAllyId = state.mafiosoIds[0];
    }

    state.status = 'scenario';
    return state;
  }

  // ============================================================
  // Getters
  // ============================================================
  function getState() { return state; }
  function getAlivePlayers() { return state.players.filter(p => !p.isEliminated); }
  function getAliveCount() { return getAlivePlayers().length; }
  function getEliminatedPlayers() { return state.players.filter(p => p.isEliminated); }
  function getPlayer(id) { return state.players.find(p => p.id === id); }
  function getCurrentRevealPlayer() {
    return state.players[state.revealIndex] || null;
  }
  function isRevealComplete() {
    return state.revealIndex >= state.players.length;
  }

  // ============================================================
  // Reveal Loop
  // ============================================================
  function startReveal() {
    state.status = 'reveal';
    state.revealIndex = 0;
  }

  function advanceReveal() {
    state.revealIndex++;
    if (isRevealComplete()) {
      state.status = 'discussion';
      // لا نعمل reset للـ revealIndex عشان renderRevealTransition تعرف إن الكشف خلص
    }
  }

  // ============================================================
  // Voting
  // ============================================================
  function registerVote(voterId, targetId) {
    const round = state.currentRound;
    if (!state.votes[round]) state.votes[round] = {};
    state.votes[round][voterId] = targetId;
    const voter = getPlayer(voterId);
    if (voter) voter.hasVoted = true;
  }

  function countVotes() {
    const round = state.currentRound;
    const roundVotes = state.votes[round] || {};
    const tally = {};
    Object.values(roundVotes).forEach(targetId => {
      tally[targetId] = (tally[targetId] || 0) + 1;
    });
    return tally; // { playerId: voteCount }
  }

  function getVoteLeader() {
    const tally = countVotes();
    if (Object.keys(tally).length === 0) return null;
    let maxVotes = 0;
    Object.values(tally).forEach(count => {
      if (count > maxVotes) maxVotes = count;
    });
    if (maxVotes === 0) return null;
    
    const leaders = Object.keys(tally).filter(id => tally[id] === maxVotes);
    return {
      playerId: leaders.length === 1 ? leaders[0] : leaders[0], // fallback leader
      isTie: leaders.length > 1,
      tiedPlayerIds: leaders,
      voteCount: maxVotes,
      tally
    };
  }

  function eliminatePlayer(playerId) {
    const player = getPlayer(playerId);
    if (!player) return null;
    player.isAlive = false;
    player.isEliminated = true;
    state.eliminatedOrder.push(playerId);
    state.eliminatedThisRound = playerId;

    // reset hasVoted for next round
    getAlivePlayers().forEach(p => { p.hasVoted = false; });

    // دليل سري للاعب المقصى
    state.currentEliminatedClue = getSecretClue(state.accusation);

    return player;
  }

  function advanceRound() {
    state.currentRound++;
    state.eliminatedThisRound = null;
    state.currentDiscussionClue = null; // تجديد الدليل للجولة الجديدة

    // تحقق من الـ Twist (لما يبقى 4 لاعبين)
    const aliveCount = getAliveCount();
    if (aliveCount === 4 && !state.midGameTwistUsed) {
      // اختر لاعب عشوائي حي للـ twist
      const alive = getAlivePlayers();
      const randomPlayer = alive[Math.floor(Math.random() * alive.length)];
      state.twistText = getRandomTwist(state.accusation, randomPlayer.name);
      state.midGameTwistUsed = true;
      state.status = 'twist';
    } else if (aliveCount <= 2) {
      state.status = 'final_vote';
    } else {
      state.status = 'discussion';
    }
  }

  // ============================================================
  // Discussion Starter Clues
  // ============================================================
  function generateDiscussionClue(specificPlayerId = null) {
    const alive = getAlivePlayers();
    if (alive.length === 0) return null;
    let target = specificPlayerId ? getPlayer(specificPlayerId) : null;
    if (!target || !target.isAlive) {
      target = alive[Math.floor(Math.random() * alive.length)];
    }
    const clueText = getDiscussionStarter(state.accusation, target.name);
    state.currentDiscussionClue = {
      targetPlayerId: target.id,
      targetPlayerName: target.name,
      storyRole: target.storyRole,
      clueText: clueText
    };
    return state.currentDiscussionClue;
  }

  function getDiscussionClue() {
    if (!state.currentDiscussionClue) {
      return generateDiscussionClue();
    }
    return state.currentDiscussionClue;
  }

  // ============================================================
  // Detective ability
  // ============================================================
  function useDetectorAbility(targetPlayerId) {
    const round = state.currentRound;
    if (state.detectorUsed[round]) return null;
    const target = getPlayer(targetPlayerId);
    if (!target) return null;
    const isMafioso = state.mafiosoIds.includes(targetPlayerId);
    state.detectorUsed[round] = targetPlayerId;
    state.detectorResults[round] = { targetId: targetPlayerId, isMafioso };
    return { targetName: target.name, isMafioso };
  }

  function getDetectorResult() {
    return state.detectorResults[state.currentRound] || null;
  }

  // ============================================================
  // Final Vote
  // ============================================================
  function registerFinalVote(voterId, targetId) {
    state.finalVotes[voterId] = targetId;
  }

  function countFinalVotes() {
    const tally = {};
    Object.values(state.finalVotes).forEach(targetId => {
      tally[targetId] = (tally[targetId] || 0) + 1;
    });
    return tally;
  }

  function getFinalVoteLeader() {
    const tally = countFinalVotes();
    if (Object.keys(tally).length === 0) return null;
    let maxVotes = 0;
    let leader = null;
    Object.entries(tally).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        leader = id;
      }
    });
    return { playerId: leader, voteCount: maxVotes, tally };
  }

  function determineWinner() {
    const leader = getFinalVoteLeader();
    const alive = getAlivePlayers();
    const playerId = leader?.playerId || (alive.length > 0 ? alive[0].id : null);
    const isMafioso = state.mafiosoIds.includes(playerId);
    return {
      accusedId: playerId,
      accusedName: getPlayer(playerId)?.name || '؟',
      innocentsWin: isMafioso,
      mafiosoNames: state.mafiosoIds.map(id => getPlayer(id)?.name).filter(Boolean)
    };
  }

  function endGame() {
    state.status = 'ended';
    const result = determineWinner();
    saveToStats(result);
    return result;
  }

  // ============================================================
  // Stats (localStorage)
  // ============================================================
  function loadStats() {
    try {
      return JSON.parse(localStorage.getItem('mafioso_stats') || 'null') || {
        totalGames: 0,
        sessions: [],
        playerStats: {}
      };
    } catch {
      return { totalGames: 0, sessions: [], playerStats: {} };
    }
  }

  function saveToStats(result) {
    const stats = loadStats();
    stats.totalGames++;

    // حساب أكتر لاعب اتصوّت عليه وهو بريء
    const voteTallies = {};
    Object.values(state.votes).forEach(roundVotes => {
      Object.values(roundVotes).forEach(targetId => {
        voteTallies[targetId] = (voteTallies[targetId] || 0) + 1;
      });
    });
    let mostVotedInnocentName = null;
    let maxVotes = 0;
    Object.entries(voteTallies).forEach(([id, count]) => {
      if (!state.mafiosoIds.includes(id) && count > maxVotes) {
        maxVotes = count;
        mostVotedInnocentName = getPlayer(id)?.name || null;
      }
    });

    // هل المافيوسو اكتُشف؟
    const mafiosoWon = !result.innocentsWin;
    const undetectedMafioso = mafiosoWon ? result.mafiosoNames.join('، ') : null;

    // سجل الجلسة
    const session = {
      date: new Date().toLocaleDateString('ar-EG'),
      time: new Date().toLocaleTimeString('ar-EG'),
      winner: result.innocentsWin ? 'الأبرياء' : 'المافيوسو',
      mafioso: result.mafiosoNames,
      accusation: state.accusation,
      scenarioTitle: state.scenario?.title || '',
      mostVotedInnocent: mostVotedInnocentName,
      undetectedMafioso
    };
    stats.sessions.unshift(session); // أضف في الأول
    if (stats.sessions.length > 50) stats.sessions = stats.sessions.slice(0, 50);

    // إحصائيات اللاعبين
    state.players.forEach(p => {
      if (!stats.playerStats[p.name]) {
        stats.playerStats[p.name] = {
          gamesTotal: 0,
          gamesAsMafioso: 0,
          winsAsMafioso: 0,
          gamesAsInnocent: 0,
          winsAsInnocent: 0,
          timesVotedOut: 0,
          timesWonUndetected: 0
        };
      }
      const ps = stats.playerStats[p.name];
      ps.gamesTotal++;

      if (state.mafiosoIds.includes(p.id)) {
        ps.gamesAsMafioso++;
        if (mafiosoWon) {
          ps.winsAsMafioso++;
          ps.timesWonUndetected++;
        }
      } else {
        ps.gamesAsInnocent++;
        if (!mafiosoWon) ps.winsAsInnocent++;
      }

      if (state.eliminatedOrder.includes(p.id)) {
        ps.timesVotedOut++;
      }
    });

    try {
      localStorage.setItem('mafioso_stats', JSON.stringify(stats));
    } catch (e) {
      console.warn('فشل حفظ الإحصائيات:', e);
    }
  }

  function clearStats() {
    localStorage.removeItem('mafioso_stats');
  }

  // ============================================================
  // Public API
  // ============================================================
  return {
    init: initGame,
    get: getState,
    getAlivePlayers,
    getAliveCount,
    getEliminatedPlayers,
    getPlayer,
    getCurrentRevealPlayer,
    isRevealComplete,
    startReveal,
    advanceReveal,
    registerVote,
    countVotes,
    getVoteLeader,
    eliminatePlayer,
    advanceRound,
    useDetectorAbility,
    getDetectorResult,
    registerFinalVote,
    countFinalVotes,
    getFinalVoteLeader,
    determineWinner,
    endGame,
    generateDiscussionClue,
    getDiscussionClue,
    loadStats,
    clearStats,
    ROLE_TYPES,
    ROLE_INFO
  };
})();
