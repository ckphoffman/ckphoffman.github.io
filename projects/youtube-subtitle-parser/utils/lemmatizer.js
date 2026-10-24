// 简单的英语词形还原器
// 基于规则的lemmatization，适用于常见英语单词

class SimpleLemmatizer {
  constructor() {
    // 不规则动词映射
    this.irregularVerbs = {
      'am': 'be', 'is': 'be', 'are': 'be', 'was': 'be', 'were': 'be', 'been': 'be', 'being': 'be',
      'have': 'have', 'has': 'have', 'had': 'have', 'having': 'have',
      'do': 'do', 'does': 'do', 'did': 'do', 'doing': 'do', 'done': 'do',
      'go': 'go', 'goes': 'go', 'went': 'go', 'gone': 'go', 'going': 'go',
      'can': 'can', 'could': 'can',
      'will': 'will', 'would': 'will',
      'shall': 'shall', 'should': 'shall',
      'may': 'may', 'might': 'may',
      'must': 'must',
      'make': 'make', 'makes': 'make', 'made': 'make', 'making': 'make',
      'take': 'take', 'takes': 'take', 'took': 'take', 'taken': 'take', 'taking': 'take',
      'come': 'come', 'comes': 'come', 'came': 'come', 'coming': 'come',
      'see': 'see', 'sees': 'see', 'saw': 'see', 'seen': 'see', 'seeing': 'see',
      'get': 'get', 'gets': 'get', 'got': 'get', 'gotten': 'get', 'getting': 'get',
      'know': 'know', 'knows': 'know', 'knew': 'know', 'known': 'know', 'knowing': 'know',
      'think': 'think', 'thinks': 'think', 'thought': 'think', 'thinking': 'think',
      'give': 'give', 'gives': 'give', 'gave': 'give', 'given': 'give', 'giving': 'give',
      'find': 'find', 'finds': 'find', 'found': 'find', 'finding': 'find',
      'tell': 'tell', 'tells': 'tell', 'told': 'tell', 'telling': 'tell',
      'become': 'become', 'becomes': 'become', 'became': 'become', 'becoming': 'become',
      'leave': 'leave', 'leaves': 'leave', 'left': 'leave', 'leaving': 'leave',
      'feel': 'feel', 'feels': 'feel', 'felt': 'feel', 'feeling': 'feel',
      'bring': 'bring', 'brings': 'bring', 'brought': 'bring', 'bringing': 'bring',
      'begin': 'begin', 'begins': 'begin', 'began': 'begin', 'begun': 'begin', 'beginning': 'begin',
      'keep': 'keep', 'keeps': 'keep', 'kept': 'keep', 'keeping': 'keep',
      'hold': 'hold', 'holds': 'hold', 'held': 'hold', 'holding': 'hold',
      'write': 'write', 'writes': 'write', 'wrote': 'write', 'written': 'write', 'writing': 'write',
      'stand': 'stand', 'stands': 'stand', 'stood': 'stand', 'standing': 'stand',
      'hear': 'hear', 'hears': 'hear', 'heard': 'hear', 'hearing': 'hear',
      'let': 'let', 'lets': 'let', 'letting': 'let',
      'mean': 'mean', 'means': 'mean', 'meant': 'mean', 'meaning': 'mean',
      'set': 'set', 'sets': 'set', 'setting': 'set',
      'meet': 'meet', 'meets': 'meet', 'met': 'meet', 'meeting': 'meet',
      'run': 'run', 'runs': 'run', 'ran': 'run', 'running': 'run',
      'pay': 'pay', 'pays': 'pay', 'paid': 'pay', 'paying': 'pay',
      'sit': 'sit', 'sits': 'sit', 'sat': 'sit', 'sitting': 'sit',
      'speak': 'speak', 'speaks': 'speak', 'spoke': 'speak', 'spoken': 'speak', 'speaking': 'speak',
      'lie': 'lie', 'lies': 'lie', 'lay': 'lie', 'lain': 'lie', 'lying': 'lie',
      'lead': 'lead', 'leads': 'lead', 'led': 'lead', 'leading': 'lead',
      'read': 'read', 'reads': 'read', 'reading': 'read',
      'grow': 'grow', 'grows': 'grow', 'grew': 'grow', 'grown': 'grow', 'growing': 'grow',
      'lose': 'lose', 'loses': 'lose', 'lost': 'lose', 'losing': 'lose',
      'fall': 'fall', 'falls': 'fall', 'fell': 'fall', 'fallen': 'fall', 'falling': 'fall',
      'send': 'send', 'sends': 'send', 'sent': 'send', 'sending': 'send',
      'build': 'build', 'builds': 'build', 'built': 'build', 'building': 'build',
      'understand': 'understand', 'understands': 'understand', 'understood': 'understand', 'understanding': 'understand',
      'draw': 'draw', 'draws': 'draw', 'drew': 'draw', 'drawn': 'draw', 'drawing': 'draw',
      'break': 'break', 'breaks': 'break', 'broke': 'break', 'broken': 'break', 'breaking': 'break',
      'spend': 'spend', 'spends': 'spend', 'spent': 'spend', 'spending': 'spend',
      'cut': 'cut', 'cuts': 'cut', 'cutting': 'cut',
      'rise': 'rise', 'rises': 'rise', 'rose': 'rise', 'risen': 'rise', 'rising': 'rise',
      'drive': 'drive', 'drives': 'drive', 'drove': 'drive', 'driven': 'drive', 'driving': 'drive',
      'buy': 'buy', 'buys': 'buy', 'bought': 'buy', 'buying': 'buy',
      'wear': 'wear', 'wears': 'wear', 'wore': 'wear', 'worn': 'wear', 'wearing': 'wear',
      'choose': 'choose', 'chooses': 'choose', 'chose': 'choose', 'chosen': 'choose', 'choosing': 'choose',
      'seek': 'seek', 'seeks': 'seek', 'sought': 'seek', 'seeking': 'seek',
      'throw': 'throw', 'throws': 'throw', 'threw': 'throw', 'thrown': 'throw', 'throwing': 'throw',
      'catch': 'catch', 'catches': 'catch', 'caught': 'catch', 'catching': 'catch',
      'deal': 'deal', 'deals': 'deal', 'dealt': 'deal', 'dealing': 'deal',
      'win': 'win', 'wins': 'win', 'won': 'win', 'winning': 'win',
      'forget': 'forget', 'forgets': 'forget', 'forgot': 'forget', 'forgotten': 'forget', 'forgetting': 'forget',
      'shake': 'shake', 'shakes': 'shake', 'shook': 'shake', 'shaken': 'shake', 'shaking': 'shake',
      'sing': 'sing', 'sings': 'sing', 'sang': 'sing', 'sung': 'sing', 'singing': 'sing',
      'hang': 'hang', 'hangs': 'hang', 'hung': 'hang', 'hanging': 'hang',
      'strike': 'strike', 'strikes': 'strike', 'struck': 'strike', 'striking': 'strike'
    };

    // 不规则名词复数
    this.irregularNouns = {
      'children': 'child',
      'men': 'man',
      'women': 'woman',
      'teeth': 'tooth',
      'feet': 'foot',
      'mice': 'mouse',
      'geese': 'goose',
      'oxen': 'ox',
      'people': 'person',
      'lives': 'life',
      'wives': 'wife',
      'knives': 'knife',
      'leaves': 'leaf',
      'loaves': 'loaf',
      'shelves': 'shelf',
      'wolves': 'wolf'
    };
  }

  lemmatize(word) {
    const lowerWord = word.toLowerCase();

    // 检查不规则动词
    if (this.irregularVerbs[lowerWord]) {
      return this.irregularVerbs[lowerWord];
    }

    // 检查不规则名词
    if (this.irregularNouns[lowerWord]) {
      return this.irregularNouns[lowerWord];
    }

    // 规则变换
    let lemma = lowerWord;

    // -ies -> -y (studies -> study)
    if (lemma.endsWith('ies') && lemma.length > 4) {
      lemma = lemma.slice(0, -3) + 'y';
    }
    // -es -> '' (watches -> watch, boxes -> box)
    else if (lemma.endsWith('sses') || lemma.endsWith('xes') || lemma.endsWith('ches') || lemma.endsWith('shes')) {
      lemma = lemma.slice(0, -2);
    }
    // -ied -> -y (tried -> try)
    else if (lemma.endsWith('ied') && lemma.length > 4) {
      lemma = lemma.slice(0, -3) + 'y';
    }
    // -ed -> '' (worked -> work)
    else if (lemma.endsWith('ed') && lemma.length > 3) {
      // 处理双写辅音字母的情况 (stopped -> stop)
      if (lemma.length > 4 && lemma[lemma.length - 3] === lemma[lemma.length - 4] &&
          this.isConsonant(lemma[lemma.length - 3])) {
        lemma = lemma.slice(0, -3);
      } else {
        lemma = lemma.slice(0, -2);
      }
    }
    // -ing -> '' (working -> work)
    else if (lemma.endsWith('ing') && lemma.length > 4) {
      // 处理双写辅音字母的情况 (running -> run)
      if (lemma.length > 5 && lemma[lemma.length - 4] === lemma[lemma.length - 5] &&
          this.isConsonant(lemma[lemma.length - 4])) {
        lemma = lemma.slice(0, -4);
      } else {
        lemma = lemma.slice(0, -3);
        // 如果去掉ing后以e结尾，可能需要加回e (making -> make)
        if (lemma.length > 1 && !lemma.endsWith('e') && this.shouldAddE(lemma)) {
          lemma = lemma + 'e';
        }
      }
    }
    // -s -> '' (works -> work, cats -> cat)
    else if (lemma.endsWith('s') && lemma.length > 2 && !lemma.endsWith('ss') && !lemma.endsWith('us')) {
      lemma = lemma.slice(0, -1);
    }

    return lemma;
  }

  isConsonant(char) {
    return !['a', 'e', 'i', 'o', 'u'].includes(char.toLowerCase());
  }

  shouldAddE(word) {
    // 简单判断是否应该加回e
    const endsWithE = ['mak', 'tak', 'giv', 'writ', 'driv', 'lov', 'liv'];
    return endsWithE.some(ending => word.endsWith(ending));
  }
}

// 导出实例
const lemmatizer = new SimpleLemmatizer();
