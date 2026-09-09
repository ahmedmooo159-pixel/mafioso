// ============================================================
// roles.js — منطق توزيع الأدوار
// ============================================================

// الأدوار المتاحة
const ROLE_TYPES = {
  MAFIOSO: 'mafioso',
  DETECTIVE: 'detective',
  FALSE_WITNESS: 'false_witness',
  SECRET_ALLY: 'secret_ally',
  INNOCENT: 'innocent'
};

// معلومات كل دور
const ROLE_INFO = {
  mafioso: {
    label: 'المافيوسو 🔴',
    emoji: '🔴',
    color: '#c0392b',
    hint: 'أنت الجاني الحقيقي! ادافع عن نفسك وحاول تلخبط الأبرياء. لو في شريك، اسمه ظاهر جنب اسمك.',
    secretLabel: 'الجاني',
    clue: 'أنت تعرف الحقيقة — تصرّف طبيعي وما تفضحش نفسك!'
  },
  detective: {
    label: 'المحقق 🕵️',
    emoji: '🕵️',
    color: '#2471a3',
    hint: 'أنت بريء! عندك قدرة خاصة: كل جولة تقدر تكشف سرًا عن لاعب واحد — هل هو مافيوسو ولا لأ. ده بيظهرلك بس في شاشة الكشف بعد كل جولة.',
    secretLabel: 'محقق سري',
    clue: 'استخدم قدرتك بذكاء — إكشف بس وفكّر كويس قبل تتكلم!'
  },
  false_witness: {
    label: 'الشاهد الكاذب 🙈',
    emoji: '🙈',
    color: '#8e44ad',
    hint: 'أنت بريء — بس عندك معلومة مشوّشة! النظام هيعطيك اسم لاعب بريء وأنت هتفتكر إنه مشكوك فيه. اتصرف بناءً على ده بشكل طبيعي.',
    secretLabel: 'شاهد مشوّش',
    clue: 'أنت مش كاذب — أنت مصدّق في معلومة غلط!'
  },
  secret_ally: {
    label: 'الحليف السري 🤝',
    emoji: '🤝',
    color: '#d35400',
    hint: 'أنت بريء رسمياً — بس عارف مين المافيوسو! دورك تحمي المافيوسو بذكاء وتلخبط التصويت لجولة واحدة بس. بعدها أنت على حالك.',
    secretLabel: 'حليف سري',
    clue: 'ساعد المافيوسو بالكلام والتشكيك في الآخرين — بدون ما تفضح نفسك!'
  },
  innocent: {
    label: 'بريء ✅',
    emoji: '✅',
    color: '#27ae60',
    hint: 'أنت بريء تماماً! شاركت في القصة بس مالكش علاقة بالجريمة. دورك تكشف المافيوسو وتحمي نفسك من الاتهام الغلط.',
    secretLabel: 'بريء',
    clue: 'راقب الكل كويس، ادافع عن نفسك، واتهم بعقل!'
  }
};

// Secret clues for eliminated players
const SECRET_CLUES = {
  قتل: [
    "همس لأي لاعب حي: 'الشكل مش متطابق مع الكلام — انتبه لمين بيحكي قصص مختلفة!'",
    "همس لأي لاعب حي: 'الجاني كان لازم يعرف التفاصيل من جوا — فكر مين الأقرب للضحية!'",
    "همس لأي لاعب حي: 'في حاجة في طريقة كلام حد ما انتبه ليها — اسمع كويس وقت الدفاع!'",
    "همس لأي لاعب حي: 'الجاني بيتجنب موضوع معين — لاحظ مين بيلف وبيدور!'",
    "همس لأي لاعب حي: 'وقت التصويت، حد هيدّافع عن نفسه أكتر من اللازم — ده علامة مهمة!'"
  ],
  سرقة: [
    "همس لأي لاعب حي: 'اللي سرق عارف تفاصيل المكان كويس — مين اللي ما بيتفاجأش بحاجة؟'",
    "همس لأي لاعب حي: 'الحادثة محتاجت وقت ومعرفة — مش أي حد ينفذها، فكّر!'",
    "همس لأي لاعب حي: 'الجاني هيحاول يحوّل الانتباه لحد تاني — انتبه للي بيتهم بسرعة!'",
    "همس لأي لاعب حي: 'في تفصيلة صغيرة مش ماشية مع قصة حد هنا — دور عليها!'",
    "همس لأي لاعب حي: 'حد من الموجودين بيتصرف عادي أكتر من اللازم — ده مش طبيعي!'"
  ],
  نصب: [
    "همس لأي لاعب حي: 'المحتال دايماً بيبان واثق جداً في كلامه — مين الأكتر هدوء ويقين هنا؟'",
    "همس لأي لاعب حي: 'دور على مين اللي ما بيعرفش التفاصيل — لو المنتج الوهمي، هيبان!'",
    "همس لأي لاعب حي: 'المحتال شاطر يغيّر موضوع الكلام — انتبه للي بيهرب من أسئلة معينة!'",
    "همس لأي لاعب حي: 'في حد هنا متلاعب في كلامه — اتكلم معاه وقايسه على نفس الموضوع تاني!'"
  ],
  اختلاس: [
    "همس لأي لاعب حي: 'اللي اختلس محتاج وصول للأرقام — مين عنده الصلاحية دي؟'",
    "همس لأي لاعب حي: 'الاختلاس محتاج وقت — مين كان متاح وحده في الأوقات المهمة؟'",
    "همس لأي لاعب حي: 'الجاني محتاج يبرر الفلوس الزيادة — سأل عن مصاريف غريبة لحد!'",
    "همس لأي لاعب حي: 'اللي بيختلس بيكون حذر جداً في تقاريره — مين اللي حريص أكتر من اللازم؟'"
  ],
  تزوير: [
    "همس لأي لاعب حي: 'المزوّر لازم يعرف تقنيات خاصة — مين اللي عنده خلفية في الوثائق؟'",
    "همس لأي لاعب حي: 'التزوير ده محتاج وقت وأدوات — مين كان عنده إمكانية الوصول؟'",
    "همس لأي لاعب حي: 'الجاني شايل سر كبير — هيبان متوتر وقت ما حد يعدّي على موضوع معين!'",
    "همس لأي لاعب حي: 'الوثيقة المزيّفة محتاجت نموذج أصلي — مين كان عنده وصول لنماذج أصلية؟'"
  ]
};

// توزيع الأدوار الوظيفية حسب عدد اللاعبين
function assignRoles(players, mafiosoCount, specialRolesEnabled) {
  const n = players.length;
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  const roleAssignments = [];

  let idx = 0;

  // المافيوسو (أو المافيوسو الأول)
  const mafiosoIds = [];
  for (let m = 0; m < mafiosoCount; m++) {
    roleAssignments.push({ playerId: shuffled[idx].id, role: ROLE_TYPES.MAFIOSO });
    mafiosoIds.push(shuffled[idx].id);
    idx++;
  }

  if (specialRolesEnabled && n > mafiosoCount + 2) {
    // المحقق
    roleAssignments.push({ playerId: shuffled[idx].id, role: ROLE_TYPES.DETECTIVE });
    idx++;

    // الشاهد الكاذب
    if (idx < n) {
      roleAssignments.push({ playerId: shuffled[idx].id, role: ROLE_TYPES.FALSE_WITNESS });
      idx++;
    }

    // الحليف السري (فقط لو مافيوسو واحد، واحتمال 50%)
    if (mafiosoCount === 1 && idx < n && Math.random() > 0.5) {
      roleAssignments.push({ playerId: shuffled[idx].id, role: ROLE_TYPES.SECRET_ALLY });
      idx++;
    }
  }

  // الباقي أبرياء
  while (idx < n) {
    roleAssignments.push({ playerId: shuffled[idx].id, role: ROLE_TYPES.INNOCENT });
    idx++;
  }

  return { roleAssignments, mafiosoIds };
}

// اختيار لاعب "مشتبه وهمي" للشاهد الكاذب (لاعب بريء عشوائي)
function getFalseWitnessTarget(players, falseWitnessId, mafiosoIds) {
  const innocents = players.filter(p =>
    p.id !== falseWitnessId && !mafiosoIds.includes(p.id)
  );
  if (innocents.length === 0) return null;
  return innocents[Math.floor(Math.random() * innocents.length)];
}

// احصل على دليل سري لاعب اتقصى
function getSecretClue(accusationType) {
  const pool = SECRET_CLUES[accusationType] || SECRET_CLUES['قتل'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// احصل على معلومات الدور
function getRoleInfo(roleType) {
  return ROLE_INFO[roleType] || ROLE_INFO.innocent;
}
