/**
 * 2022 개정 영어과 교육과정 [별표 4] 의사소통에 필요한 언어 형식
 * - 40개 범주를 수업에서 바로 고를 수 있는 세부 항목으로 나누었습니다.
 * - level: 교육과정의 '학습 시작 권장 학교급'(초/중/고) — 예문 옆 ● 위치 기준
 * - example: 교육과정 예문(그대로 인용)
 * - pattern: 가사에서 해당 표현을 찾아 굵게·밑줄 표시하기 위한 정규식(완벽하지 않으므로 '후보 표시' 용도)
 * - ext: true 이면 교육과정 예문 범위를 수업용으로 조금 넓힌 항목
 */

export const GRADES = [
  "초등 3~4학년", "초등 5~6학년",
  "중학교 1학년", "중학교 2학년", "중학교 3학년",
  "고등학교 1학년", "고등학교 2학년", "고등학교 3학년",
];

export const CATEGORIES = [
  { no: 1, en: "Nouns", ko: "명사" },
  { no: 2, en: "Determiners", ko: "한정사" },
  { no: 3, en: "Generic Expressions", ko: "총칭 표현" },
  { no: 4, en: "Pronouns", ko: "대명사" },
  { no: 5, en: "Substitute Expressions", ko: "대용 표현" },
  { no: 6, en: "Nonreferential It", ko: "비인칭 주어 it" },
  { no: 7, en: "Tenses", ko: "시제" },
  { no: 8, en: "Progressives", ko: "진행형" },
  { no: 9, en: "Perfectives", ko: "완료형" },
  { no: 10, en: "Sentence Patterns", ko: "문장 형식" },
  { no: 11, en: "Enough / Too", ko: "enough / too" },
  { no: 12, en: "Equatives", ko: "원급 비교" },
  { no: 13, en: "Comparatives", ko: "비교급" },
  { no: 14, en: "Superlatives", ko: "최상급" },
  { no: 15, en: "Causative Verbs / Sensory Perception Verbs", ko: "사역동사·지각동사" },
  { no: 16, en: "To-Infinitive", ko: "to부정사" },
  { no: 17, en: "To-Infinitive as an adjective complement", ko: "형용사 + to부정사" },
  { no: 18, en: "Gerunds", ko: "동명사" },
  { no: 19, en: "Clause Types", ko: "문장의 종류" },
  { no: 20, en: "Negation", ko: "부정" },
  { no: 21, en: "Interrogatives", ko: "의문문" },
  { no: 22, en: "Direct Speech / Indirect Speech", ko: "직접·간접화법" },
  { no: 23, en: "Reports of Questions and Statements", ko: "간접의문문·명사절" },
  { no: 24, en: "Real Conditionals", ko: "조건문" },
  { no: 25, en: "Unreal Conditionals", ko: "가정법" },
  { no: 26, en: "Modals", ko: "조동사" },
  { no: 27, en: "Coordinating Conjunctions", ko: "등위·상관 접속사" },
  { no: 28, en: "Subordinating Conjunctions", ko: "종속 접속사" },
  { no: 29, en: "Conjunctive Adverbials", ko: "접속부사" },
  { no: 30, en: "Relative Clauses", ko: "관계사절" },
  { no: 31, en: "Postmodification", ko: "후치 수식" },
  { no: 32, en: "Adverbial Participles", ko: "분사구문" },
  { no: 33, en: "Stance Markers", ko: "문장 부사(태도 표현)" },
  { no: 34, en: "Ellipsis", ko: "생략" },
  { no: 35, en: "Inversion", ko: "도치" },
  { no: 36, en: "Nonreferential There", ko: "There 구문" },
  { no: 37, en: "Focus / Emphasis", ko: "강조" },
  { no: 38, en: "Anticipatory It", ko: "가주어·가목적어 it" },
  { no: 39, en: "Appositives", ko: "동격" },
  { no: 40, en: "Passive Voice", ko: "수동태" },
];

const PP = "(?:\\w+ed|\\w+en|born|made|lost|found|left|told|held|caught|taught|built|sold|known|seen|done|given|written|broken|chosen|frozen|forgotten|hidden|meant|kept|hurt|put|set|thrown|torn|worn|said|heard|felt|brought|bought|thought|sent|spent|won|led|fed|met|paid|read|cut|shut|stuck|struck|hung|sung|rung|begun|run|come|become|gone|been|had|got|gotten)";
const OBJ = "(?:me|you|him|her|us|them|it|'em|my \\w+|your \\w+|the \\w+|this \\w+|everyone|everybody|someone)";

function item(id, cat, label, form, level, grade, example, keywords, pattern, ext) {
  return { id, cat, label, form, level, grade, example, keywords: keywords || [], pattern: pattern || "", ext: !!ext };
}

export const GRAMMAR_ITEMS = [
  // 1. Nouns
  item("noun_count", 1, "셀 수 있는 명사·셀 수 없는 명사", "a/the + 명사, 복수형", "초", "초등 5~6학년", "A boy/The boy/The (two) boys ran in the park.", ["가산명사", "불가산명사", "복수", "관사", "a the", "물질명사"]),
  item("noun_special", 1, "주의할 명사(집합명사·-s로 끝나는 단수)", "audience, news, mathematics", "고", "고등학교 1학년", "The news is very interesting.", ["집합명사", "news", "audience", "수일치"]),
  // 2. Determiners
  item("det_demonstrative", 2, "지시 한정사", "this / that / these / those", "초", "초등 5~6학년", "These/Those books are really large.", ["지시사", "지시형용사", "this that"], "\\b(?:this|that|these|those)\\s+[a-z]+"),
  item("det_quantifier", 2, "수량 한정사", "many / much / a few / a little / every / each / all", "중", "중학교 1학년", "A few/few students came late for class.", ["수량형용사", "many much", "a few", "a little", "every", "each", "all", "some any"], "\\b(?:many|much|a few|few|a little|little|every|each|all|most|any|no)\\s+[a-z]+"),
  // 3. Generic
  item("generic", 3, "총칭 표현", "a + 단수 / the + 단수 / 복수형", "중", "중학교 3학년", "Lions are brave.", ["총칭", "일반적인 대상"]),
  // 4. Pronouns
  item("pron_personal", 4, "인칭·소유대명사", "I-my-me-mine", "초", "초등 3~4학년", "I like your glasses. What about mine?", ["인칭대명사", "소유대명사", "mine", "yours"], "\\b(?:mine|yours|his|hers|ours|theirs)\\b"),
  item("pron_reflexive", 4, "재귀대명사", "myself / yourself / themselves", "중", "중학교 1학년", "You should be proud of yourself.", ["재귀", "myself", "yourself", "oneself"], "\\b(?:myself|yourself|himself|herself|itself|ourselves|yourselves|themselves)\\b"),
  item("pron_reciprocal", 4, "상호대명사", "each other / one another", "중", "중학교 2학년", "They’re talking to each other.", ["each other", "one another", "서로"], "\\b(?:each other|one another)\\b"),
  // 5. Substitute
  item("subst_one", 5, "부정대명사 one / another / the other(s)", "one, ones, another, the others", "중", "중학교 2학년", "I have three books. One is mine. The others are yours.", ["부정대명사", "one", "another", "the other", "the others"], "\\b(?:the ones?|another|the others?)\\b"),
  item("subst_that_of", 5, "that of / those of", "that of ~, those of ~", "중", "중학교 3학년", "The climate of Seoul is milder than that of New York.", ["that of", "those of", "반복 회피"], "\\b(?:that|those) of\\b"),
  item("subst_do_so", 5, "do so", "do so", "고", "고등학교 1학년", "I’d like to write a diary, but I’m too busy to do so.", ["do so"], "\\bdo so\\b"),
  // 6. It
  item("it_nonref", 6, "비인칭 주어 it", "It's + 날씨·시간·요일·거리", "초", "초등 3~4학년", "It’s cold outside.", ["비인칭", "날씨", "시간", "it's"], "\\bit(?:'s| is| was)\\s+(?:so\\s|too\\s|very\\s)?(?:cold|hot|warm|cool|windy|rainy|raining|snowing|sunny|cloudy|dark|late|early|time|far|christmas|\\w+day|half|\\d+)\\b"),
  // 7. Tenses
  item("tense_present", 7, "현재시제(습관·일반적 사실)", "동사원형 / 3인칭 단수 -s", "초", "초등 3~4학년", "He walks to school every day.", ["현재형", "현재시제", "3인칭 단수"]),
  item("tense_past", 7, "과거시제(규칙·불규칙 동사)", "V-ed / 불규칙 과거형", "초", "초등 5~6학년", "We played soccer yesterday.", ["과거형", "과거시제", "불규칙동사", "was were"], "\\b(?:was|were|did|went|came|saw|told|said|made|knew|thought|found|felt|left|gave|took|got|lived|tried|played|called|loved|wanted|needed|waited|believed|cried|broke|fell|met|ran|sang|wrote|heard|held)\\b"),
  item("tense_will", 7, "미래 표현 will", "will + 동사원형 / won't", "초", "초등 5~6학년", "I will visit New York next year.", ["미래", "will", "won't", "'ll"], "\\b(?:will|won't|\\w+'ll)\\s+(?:not\\s|never\\s|always\\s|just\\s|be\\s)?[a-z]+"),
  item("tense_going_to", 7, "미래 표현 be going to (gonna)", "be going to + 동사원형", "초", "초등 5~6학년", "She is going to visit her grandparents next week.", ["be going to", "gonna", "미래", "예정"], "\\b(?:going to|gonna)\\s+[a-z]+"),
  // 8. Progressives
  item("prog_present", 8, "현재진행형", "am/is/are + V-ing", "초", "초등 5~6학년", "He is sleeping now.", ["진행형", "현재진행", "ing"], "\\b(?:am|is|are|'m|'re)\\s+(?:not\\s|still\\s|just\\s|always\\s|never\\s)?[a-z]+(?:ing|in')\\b"),
  item("prog_past", 8, "과거진행형", "was/were + V-ing", "중", "중학교 1학년", "I was studying when John called me.", ["과거진행", "진행형", "was ing"], "\\b(?:was|were)\\s+(?:not\\s|still\\s|just\\s|always\\s)?[a-z]+(?:ing|in')\\b"),
  item("prog_future", 8, "미래진행형·진행형으로 미래 표현", "will be + V-ing / be + V-ing (예정)", "중", "중학교 2학년", "She will be coming soon.", ["미래진행", "will be ing"], "\\bwill be\\s+[a-z]+ing\\b|\\b(?:am|'m|are|'re|is)\\s+(?:never\\s)?(?:leaving|coming|going)\\b"),
  item("prog_stative", 8, "상태·태도를 나타내는 진행형", "be being + 형용사 / be hoping", "고", "고등학교 1학년", "He’s being very rude.", ["being", "상태동사 진행"], "\\b(?:am|is|are|'m|'re|'s)\\s+being\\b|\\b(?:are|'re|am|'m)\\s+hoping\\b"),
  // 9. Perfectives
  item("perf_present", 9, "현재완료(경험·계속·완료·결과)", "have/has + p.p.", "중", "중학교 3학년", "Have you ever been to Florida?", ["현재완료", "have pp", "경험", "계속", "완료", "결과", "ever", "never"], "\\b(?:have|has|'ve|haven't|hasn't)\\s+(?:never\\s|ever\\s|always\\s|just\\s|already\\s|not\\s|)" + PP + "\\b|\\b(?:have|has)\\s+(?:you|i|we|they|he|she|it)\\s+(?:ever\\s|never\\s|already\\s)?" + PP + "\\b"),
  item("perf_present_prog", 9, "현재완료진행", "have/has been + V-ing", "중", "중학교 3학년", "I’ve been reading for two hours.", ["현재완료진행", "have been ing"], "\\b(?:have|has|'ve|'s)\\s+(?:always\\s|just\\s|never\\s)?been\\s+[a-z]+(?:ing|in')\\b"),
  item("perf_past", 9, "과거완료", "had + p.p.", "중", "중학교 3학년", "He had already left when we arrived.", ["과거완료", "had pp", "대과거"], "\\b(?:had|'d)\\s+(?:never\\s|already\\s|just\\s|not\\s|ever\\s)?" + PP + "\\b"),
  item("perf_future", 9, "미래완료", "will have + p.p.", "고", "고등학교 1학년", "I will have finished my homework by the time you get here.", ["미래완료", "will have pp"], "\\bwill have\\s+" + PP + "\\b"),
  // 10. Sentence Patterns
  item("sp_linking", 10, "감각동사 + 형용사 (2형식)", "look / feel / sound / seem + 형용사", "초", "초등 5~6학년", "You look happy today.", ["2형식", "감각동사", "look", "feel", "sound", "seem", "become"], "\\b(?:look|looks|looked|feel|feels|felt|sound|sounds|seem|seems|seemed|taste|smell|become|became|get|got|grow|grew)\\s+(?:so\\s|very\\s|too\\s|like\\s)?[a-z]+"),
  item("sp_svo", 10, "1~3형식 기본 문장", "S + V (+ C / O)", "초", "초등 3~4학년", "I like gimbap.", ["1형식", "3형식", "문장의 형식", "기본 문장"]),
  item("sp_dative", 10, "수여동사 (4형식)", "give / send / show / tell + 간접목적어 + 직접목적어", "중", "중학교 1학년", "He gave me a present.", ["4형식", "수여동사", "간접목적어", "직접목적어"], "\\b(?:give|gave|send|sent|show|showed|tell|told|bring|brought|buy|bought|teach|taught|lend|lent|pass|write|wrote|sing|sang)\\s+(?:me|you|him|her|us|them)\\s+(?:a|an|the|some|my|your|his|her|our|their|all|this|that|one|no)\\b"),
  item("sp_object_complement", 10, "목적격 보어 (5형식)", "make / keep / call / find + 목적어 + 형용사·명사", "중", "중학교 2학년", "They elected him president.", ["5형식", "목적격보어", "make o c", "keep o c", "call"], "\\b(?:make|makes|made|keep|keeps|kept|call|calls|called|find|finds|found|leave|leaves|left|drive|drives|drove|elect|elected|name|named|consider|considered)\\s+" + OBJ + "\\s+(?!to\\b|go\\b|feel\\b|be\\b)[a-z]+"),
  // 11. Enough / Too
  item("too_enough", 11, "too / enough", "too + 형용사, 형용사 + enough", "중", "중학교 1학년", "Is the room warm enough?", ["too", "enough", "너무", "충분히"], "\\btoo\\s+[a-z]+|\\b[a-z]+\\s+enough\\b"),
  item("cannot_too", 11, "cannot ~ too / enough (아무리 ~해도 지나치지 않다)", "cannot + V + too / enough", "고", "고등학교 2학년", "We cannot thank you enough.", ["cannot too", "cannot enough", "아무리"], "\\b(?:cannot|can't|can not)\\s+[a-z]+\\s+(?:\\w+\\s)?(?:too|enough)\\b"),
  // 12. Equatives
  item("as_as", 12, "원급 비교 as ~ as", "as + 원급 + as", "중", "중학교 2학년", "She is as tall as her mother (is).", ["원급", "as as", "동등비교"], "\\bas\\s+(?:\\w+\\s)?[a-z]+\\s+as\\b"),
  item("as_many_as", 12, "as many/much ~ as, the same ~ as", "as many/much + 명사 + as / the same ~ as", "고", "고등학교 1학년", "I don’t know as many people as you (do).", ["as many as", "the same as"], "\\bas (?:many|much)\\b|\\bthe same\\s+(?:\\w+\\s)?as\\b"),
  // 13. Comparatives
  item("comp_er", 13, "비교급 -er / more ~ than", "비교급 + than", "초", "중학교 1학년", "Mary is taller than I/me.", ["비교급", "than", "er", "more"], "\\b(?:[a-z]+er|more\\s[a-z]+|less\\s[a-z]+|better|worse)\\s+than\\b|\\b(?:better|stronger|brighter|bigger|harder|closer|higher|deeper|longer|younger|older|faster|greater|kinder|happier|easier|warmer|colder)\\b"),
  item("comp_much", 13, "비교급 강조 much / less ~ than", "much + 비교급, less + 원급 + than", "중", "중학교 2학년", "A car is much more expensive than a motorbike.", ["비교급 강조", "much", "even", "far", "less"], "\\b(?:much|even|far|a lot|a little|a bit|little bit)\\s+(?:more\\s[a-z]+|[a-z]+er)\\b"),
  item("comp_the_the", 13, "the + 비교급, the + 비교급", "The more ~, the more ~", "중", "중학교 3학년", "The more she thought about it, the less she liked it.", ["the 비교급", "~할수록"], "\\bthe\\s+(?:more|less|[a-z]+er)\\b[^,]*,?\\s*the\\s+(?:more|less|[a-z]+er)\\b"),
  item("comp_prefer", 13, "prefer A to B", "prefer A to B", "중", "중학교 3학년", "I prefer tea to coffee.", ["prefer", "선호"], "\\bprefer\\b"),
  // 14. Superlatives
  item("superlative", 14, "최상급", "the + -est / the most + 형용사", "중", "중학교 2학년", "Cindy is the shortest of the three.", ["최상급", "the most", "est", "best"], "\\bthe\\s+(?:[a-z]+est|most\\s[a-z]+|best|worst|least\\s[a-z]+)\\b|\\b(?:my|your|our)\\s+(?:best|greatest|biggest)\\b"),
  item("superlative_ever", 14, "최상급 + 현재완료 / one of the 최상급", "the 최상급 + (that) S have ever p.p.", "중", "중학교 3학년", "It is the most interesting speech I’ve ever heard.", ["ever", "one of the", "최상급 현재완료"], "\\bone of the\\s+(?:[a-z]+est|most)\\b|\\b(?:[a-z]+est|most\\s[a-z]+|best)\\b[^.]*\\bever\\b"),
  // 15. Causative / Perception
  item("caus_make_let_have", 15, "사역동사 make / let / have + 목적어 + 동사원형", "make/let/have + O + V", "중", "중학교 3학년", "I made him carry the box.", ["사역동사", "사역", "make", "let", "have", "시키다", "허락"], "\\b(?:make|makes|made|let|lets|letting|have|has|had)\\s+" + OBJ + "\\s+(?!to\\b|a\\b|an\\b|the\\b|so\\b|very\\b|happy\\b|sad\\b|crazy\\b|strong\\b|stronger\\b|beautiful\\b|feel\\s?like)[a-z]+"),
  item("caus_get_to", 15, "get + 목적어 + to부정사", "get + O + to V", "중", "중학교 3학년", "My mom got me to clean the room.", ["get to", "사역"], "\\b(?:get|gets|got)\\s+" + OBJ + "\\s+to\\s+[a-z]+"),
  item("caus_have_pp", 15, "have/get + 목적어 + 과거분사", "have + O + p.p.", "중", "중학교 3학년", "Bill had the car cleaned.", ["have pp", "사역 수동"], "\\b(?:have|has|had|get|got)\\s+(?:my|your|the|his|her|it)\\s?[a-z]*\\s+" + PP + "\\b"),
  item("perception", 15, "지각동사 + 목적어 + 동사원형/V-ing", "see / hear / watch / feel + O + V(-ing)", "중", "중학교 3학년", "I heard the children sing/singing.", ["지각동사", "see", "hear", "watch", "feel", "notice"], "\\b(?:see|saw|seen|hear|heard|watch|watched|feel|felt|notice|noticed)\\s+" + OBJ + "\\s+[a-z]+(?:ing|in')?\\b"),
  // 16. To-infinitive
  item("inf_noun", 16, "to부정사 명사적 용법 (목적어·주어·보어)", "want / hope / decide / need + to V", "중", "중학교 1학년", "He wanted to go home.", ["to부정사", "명사적 용법", "want to", "wanna", "hope to"], "\\b(?:want|wants|wanted|wanna|hope|hoped|need|needs|needed|decide|decided|plan|try|tried|learn|learned|like|love|begin|began|start|started|choose|promise|refuse|wish|expect|forget|remember)\\s+to\\s+[a-z]+|\\bwanna\\s+[a-z]+"),
  item("inf_adj", 16, "to부정사 형용사적 용법", "명사 + to V (~할)", "중", "중학교 1학년", "I have a book to read.", ["형용사적 용법", "명사 수식", "something to"], "\\b(?:something|nothing|anything|everything|someone|somebody|nobody|a\\s[a-z]+|time|way|reason|chance|place|one|song|dream|permission|courage|power|right|story|words?)\\s+to\\s+[a-z]+"),
  item("inf_adv", 16, "to부정사 부사적 용법 (목적·감정의 원인)", "~하기 위해 / ~해서", "중", "중학교 1학년", "He came to see me.", ["부사적 용법", "목적", "in order to", "~하기 위해"], "\\b(?:in order to|so as to)\\s+[a-z]+|\\b(?:came|come|go|went|here|there|live|lived|born|run|ran|fight|work|wait|waited)\\s+to\\s+[a-z]+"),
  item("inf_wh", 16, "의문사 + to부정사", "how / what / where / when + to V", "중", "중학교 2학년", "The problem is where to get money (from).", ["how to", "what to", "where to", "의문사 to부정사"], "\\b(?:how|what|where|when|which|who|whether)\\s+to\\s+[a-z]+"),
  item("inf_too_enough", 16, "too ~ to / ~ enough to", "too + 형용사 + to V / 형용사 + enough + to V", "중", "중학교 3학년", "This story sounds too good (to be true).", ["too to", "enough to", "너무 ~해서 ~할 수 없다"], "\\btoo\\s+[a-z]+\\s+(?:for\\s\\w+\\s)?to\\s+[a-z]+|\\benough\\s+(?:for\\s\\w+\\s)?to\\s+[a-z]+"),
  item("inf_for_subject", 16, "to부정사의 의미상 주어 for/of", "for + 목적격 + to V", "중", "중학교 3학년", "The turtle moves slowly enough for us to catch it.", ["의미상 주어", "for 목적격", "of 목적격"], "\\bfor\\s+(?:me|you|him|her|us|them|everyone|\\w+)\\s+to\\s+[a-z]+"),
  item("inf_object", 16, "목적격 보어 to부정사", "want / ask / tell + O + to V", "중", "중학교 2학년", "I asked her to help me.", ["목적격보어 to부정사", "want o to", "tell o to", "ask o to"], "\\b(?:want|wants|wanted|ask|asked|tell|told|need|needed|expect|allow|allowed|teach|taught|would like|'d like|beg|begged|remind|encourage)\\s+" + OBJ + "\\s+to\\s+[a-z]+"),
  item("inf_help", 16, "help + 목적어 + (to) 동사원형", "help + O + (to) V", "중", "중학교 2학년", "I helped my mom (to) wash the dishes.", ["help", "준사역"], "\\b(?:help|helps|helped)\\s+" + OBJ + "\\s+(?:to\\s)?[a-z]+"),
  item("inf_promise_persuade", 16, "promise / persuade + O + to V", "promise O to V / persuade O to V", "고", "고등학교 2학년", "Bill persuaded Jane to work out with him.", ["persuade", "promise"], "\\b(?:promise|promised|persuade|persuaded|convince|convinced)\\s+" + OBJ + "\\s+to\\s+[a-z]+"),
  item("inf_perfect", 16, "완료부정사 / seem to", "seem to (have p.p.)", "고", "고등학교 2학년", "He seemed to have been ill (for some time).", ["완료부정사", "seem to", "to have pp"], "\\b(?:seem|seems|seemed|appear|appears)\\s+to\\s+[a-z]+|\\bto have\\s+" + PP + "\\b"),
  // 17. Adjective + to
  item("adj_to", 17, "형용사 + to부정사", "glad / happy / easy / hard / ready + to V", "중", "중학교 2학년", "Chris was glad to hear the news.", ["형용사 to부정사", "glad to", "easy to", "hard to", "ready to"], "\\b(?:glad|happy|sad|sorry|ready|easy|hard|difficult|afraid|proud|lucky|able|free|slow|quick|scared|excited|pleased|surprised|sure|nice|good|safe|impossible|possible)\\s+to\\s+[a-z]+"),
  // 18. Gerunds
  item("ger_subject", 18, "동명사 주어·보어", "V-ing + 동사 / be + V-ing", "중", "중학교 2학년", "Playing baseball is fun.", ["동명사", "주어", "ing 주어"], "^\\s*(?:and\\s|but\\s|'cause\\s)?[A-Za-z]+ing\\b(?:\\s+[a-z]+){0,3}\\s+(?:is|was|can|will|makes?|keeps?|means?|takes?|hurts?)\\b"),
  item("ger_object", 18, "동명사를 목적어로 쓰는 동사", "enjoy / keep / stop / finish + V-ing", "중", "중학교 2학년", "We enjoy swimming in the pool.", ["동명사 목적어", "enjoy", "keep", "stop", "finish", "mind", "quit"], "\\b(?:enjoy|enjoyed|keep|keeps|kept|stop|stopped|finish|finished|quit|mind|avoid|practice|imagine|miss|missed|give up|gave up|start|started|began|love|loved|like|hate|remember|forget|try|tried)\\s+(?:on\\s)?[a-z]+(?:ing|in')\\b"),
  item("ger_prep", 18, "전치사 + 동명사", "interested in / without / by / about + V-ing", "중", "중학교 2학년", "I’m interested in watching horror movies.", ["전치사 동명사", "without ing", "by ing"], "\\b(?:of|in|about|for|without|by|at|before|after|from|on|instead of|like)\\s+[a-z]+(?:ing|in')\\b"),
  item("ger_idiom", 18, "동명사 관용 표현", "go V-ing / feel like V-ing / cannot help V-ing / be worth V-ing", "중", "중학교 3학년", "I don't feel like sleeping now.", ["feel like", "cannot help", "go fishing", "worth", "관용"], "\\b(?:feel like|feels like|felt like|cannot help|can't help|couldn't help|worth|go|went|goes|no use)\\s+[a-z]+(?:ing|in')\\b"),
  item("ger_no_use", 18, "It's no use V-ing / It goes without saying", "It's no use V-ing", "고", "고등학교 1학년", "It’s no use trying to persuade me.", ["no use", "goes without saying"], "\\bno use\\s+[a-z]+ing\\b|\\bgoes without saying\\b"),
  item("ger_used_to", 18, "be used to V-ing / look forward to V-ing", "to + V-ing (전치사 to)", "고", "고등학교 1학년", "(확장 예문) I’m used to getting up early.", ["be used to", "get used to", "look forward to", "익숙하다"], "\\b(?:used|use)\\s+to\\s+[a-z]+(?:ing|in')\\b|\\blook(?:ing)? forward to\\b", true),
  // 19. Clause types
  item("cl_imperative", 19, "명령문·Let's", "동사원형 ~ / Don't ~ / Let's ~", "초", "초등 3~4학년", "Open your book.", ["명령문", "let's", "don't", "제안"], "^\\s*(?:oh,?\\s|so\\s|now\\s|baby,?\\s|please\\s|just\\s)?(?:don't|do not|let's|let us|never|please|come|go|take|look|listen|open|remember|stay|hold|give|tell|make|be|try|keep|leave|stop|lean|imagine|clap|shake|raise|heal|fix|count|dance|sing|say|turn|bring|show|call|wake|put|get|believe|forget|kiss|walk|run|jump|smile|shine|follow|wait|close|let)\\b"),
  item("cl_exclamation", 19, "감탄문", "How + 형용사 + S + V! / What a + 명사!", "중", "중학교 1학년", "What a wonderful day it is!", ["감탄문", "how", "what a"], "\\bhow\\s+[a-z]+\\s+(?:she|he|it|you|they|we|i|this|that)\\s+(?:is|are|was|were|am|looks?)\\b|\\bwhat an?\\s+[a-z]+"),
  // 20. Negation
  item("neg_basic", 20, "부정문", "be + not / don't / can't / won't", "초", "초등 3~4학년", "I don’t like snakes.", ["부정문", "not", "don't", "can't"], "\\b(?:am not|is not|are not|isn't|aren't|wasn't|weren't|don't|doesn't|didn't|can't|cannot|won't|ain't|never)\\b"),
  item("neg_partial", 20, "준부정어", "few / no / seldom / hardly", "중", "중학교 3학년", "The children seldom/rarely/hardly/scarcely like carrots.", ["준부정어", "hardly", "seldom", "rarely", "few", "nobody", "nothing"], "\\b(?:seldom|rarely|hardly|scarcely|barely|nobody|no one|nothing|nowhere)\\b"),
  // 21. Interrogatives
  item("q_yesno", 21, "Yes/No 의문문", "Be / Do / Can + S ~?", "초", "초등 3~4학년", "Do you like oranges?", ["의문문", "yes no", "do you"], "^\\s*(?:oh,?\\s|so\\s|baby,?\\s)?(?:are|is|am|was|were|do|does|did|can|could|will|would|have|has|should)\\s+(?:you|i|we|they|he|she|it|there)\\b"),
  item("q_wh", 21, "의문사 의문문", "Who / What / When / Where / Why / How ~?", "초", "초등 3~4학년", "Why did he leave early?", ["의문사", "wh", "who", "what", "why", "how", "where"], "^\\s*(?:oh,?\\s|so\\s|but\\s|and\\s|baby,?\\s)?(?:who|what|when|where|why|how|which|whose)(?:'s|'ll|'d)?\\b"),
  item("q_negative", 21, "부정의문문", "Don't you ~? / Won't you ~?", "중", "중학교 1학년", "Won’t you have some cookies?", ["부정의문문", "won't you", "don't you"], "\\b(?:don't|won't|can't|isn't|aren't|didn't|wouldn't|doesn't|haven't)\\s+(?:you|we|they|he|she|it|i)\\b[^.]*\\?"),
  item("q_tag", 21, "부가의문문", "~, isn't it? / ~, don't you?", "중", "중학교 2학년", "This is your book, isn’t it?", ["부가의문문", "isn't it", "shall we"], ",\\s*(?:isn't|aren't|don't|doesn't|didn't|won't|can't|wasn't|haven't|is|are|do|does|will|shall|have|can)\\s+(?:it|you|he|she|they|we|i|there)\\s*\\?"),
  item("q_how_adj", 21, "How + 형용사/부사 의문문", "How far / How long / How come ~?", "중", "중학교 1학년", "How far did you drive today?", ["how far", "how long", "how much", "how come", "how many"], "\\bhow\\s+(?:far|long|much|many|old|big|often|come|good|deep|high|soon)\\b"),
  // 22. Speech
  item("speech_statement", 22, "간접화법(평서문)", "said (that) ~ / told me (that) ~", "중", "중학교 3학년", "He told me that he had been busy lately.", ["간접화법", "said that", "told me that", "화법 전환"], "\\b(?:said|says|told|tells|tell)\\s+(?:me|you|him|her|us|them)?\\s*(?:that\\s)?(?:i|you|he|she|we|they|it|there|my|your)\\b"),
  item("speech_command_question", 22, "간접화법(명령문·의문문)", "asked/told + O + to V, asked if/whether ~", "고", "고등학교 1학년", "He asked if/whether I needed a pen.", ["간접화법 의문문", "asked if", "asked me to"], "\\b(?:asked|ask|told)\\s+(?:me|you|him|her|us|them)?\\s*(?:to|if|whether)\\s+[a-z]+"),
  // 23. Reports
  item("indirect_question", 23, "간접의문문", "I don't know where ~ / I wonder how ~", "중", "중학교 3학년", "I don’t know where he lives.", ["간접의문문", "wonder", "know where", "tell me what"], "\\b(?:know|knew|wonder|wondering|wondered|tell me|ask|asked|see|understand|remember|forget|forgot|show me|guess|imagine|decide)\\s+(?:what|where|when|why|how|who|whose|which|if|whether)\\b"),
  item("that_clause", 23, "명사절 that (생략 포함)", "think / know / hope / believe (that) + S + V", "중", "중학교 2학년", "I think (that) he is a good actor.", ["명사절", "that절", "think that", "hope that", "접속사 that"], "\\b(?:think|know|hope|believe|guess|feel|knew|thought|believed|hoped|swear|promise|bet|pray|realize|realized|heard|hear)\\s+(?:that\\s)?(?:i|you|he|she|we|they|it|there|this|my|your|our|everything|nothing|someday)\\b"),
  // 24. Real conditionals
  item("cond_if", 24, "조건의 if", "If + 현재시제, will / 명령문", "중", "중학교 2학년", "I’ll lend Jack the book if he needs it.", ["조건문", "if", "만약", "조건"], "\\bif\\b"),
  item("cond_unless", 24, "unless / in case / as long as", "unless ~, in case ~, as long as ~", "고", "고등학교 1학년", "We’re going to play baseball tomorrow unless it rains.", ["unless", "in case", "as long as", "provided"], "\\b(?:unless|in case|as long as|provided that|on condition that)\\b"),
  // 25. Unreal
  item("subj_past", 25, "가정법 과거", "If + S + 과거형(were), S + would/could + V", "중", "중학교 3학년", "If I were/was a bird, I could fly home.", ["가정법", "가정법 과거", "if i were", "would could"], "\\bif\\s+(?:i|you|he|she|we|they|it)\\s+(?:were|was|had|could|knew|did|didn't|weren't|wasn't|\\w+ed)\\b|\\b(?:i|you|we|they|he|she)(?:'d| would| could)\\s+(?!have\\b)[a-z]+"),
  item("subj_past_perfect", 25, "가정법 과거완료·도치", "If + had p.p., would have p.p. / Had I ~", "고", "고등학교 2학년", "Had I had enough money, I would have bought a cell phone.", ["가정법 과거완료", "would have pp", "had i"], "\\bif\\s+[a-z]+\\s+had\\s+[a-z]+|\\b(?:would|could|might)(?:\\s+not)?\\s+(?:have|'ve)\\s+" + PP + "\\b"),
  item("subj_without", 25, "Without / But for / If it were not for", "Without ~, S + would ~", "고", "고등학교 2학년", "Without/But for your advice, I would have failed.", ["without", "but for", "if it were not for"], "\\b(?:without you|but for|if it (?:were|was)n't for|if it were not for)\\b"),
  item("subj_wish", 25, "I wish 가정법", "I wish + S + 과거 / had p.p.", "중", "중학교 3학년", "I wish I spoke English well.", ["wish", "가정법 wish", "~라면 좋을 텐데"], "\\bwish(?:ed)?\\s+(?:that\\s)?(?:i|you|he|she|we|they|it)\\s+[a-z]+"),
  item("subj_as_if", 25, "as if / as though 가정법", "as if + S + 과거 / had p.p.", "고", "고등학교 1학년", "He acts as if he knew you.", ["as if", "as though", "마치"], "\\bas (?:if|though)\\b"),
  item("subj_its_time", 25, "It's time + 가정법 과거", "It's time (that) + S + 과거", "중", "중학교 3학년", "It’s time you were in bed.", ["it's time"], "\\bit'?s (?:about |high )?time\\b"),
  // 26. Modals
  item("modal_can", 26, "can / could (능력·허가·요청)", "can + V / Could you ~?", "초", "초등 3~4학년", "She can play the violin.", ["조동사", "can", "could", "능력", "허가"], "\\b(?:can|can't|cannot|could|couldn't)\\s+(?:not\\s|never\\s|just\\s|still\\s|you\\s|i\\s|we\\s)?[a-z]+"),
  item("modal_may", 26, "may / might (허가·추측)", "may + V / might + V", "초", "초등 5~6학년", "May I borrow your book?", ["may", "might", "추측", "허가"], "\\b(?:may|might|mightn't)\\s+(?:not\\s)?[a-z]+"),
  item("modal_must", 26, "must / have to (의무·강한 추측)", "must + V / have to + V", "중", "중학교 1학년", "They must do well on the test.", ["must", "have to", "의무", "gotta"], "\\b(?:must|mustn't|have to|has to|had to|gotta|got to|have got to)\\s+[a-z]+"),
  item("modal_should", 26, "should / had better / ought to", "should + V / had better + V", "중", "중학교 1학년", "You should do as he says.", ["should", "had better", "ought to", "충고"], "\\b(?:should|shouldn't|had better|'d better|ought to)\\s+[a-z]+"),
  item("modal_dont_have_to", 26, "don't have to / need not (불필요)", "don't have to + V / needn't + V", "중", "중학교 1학년", "You don’t have to go to school tomorrow.", ["don't have to", "need not", "불필요", "don't need to"], "\\b(?:don't|doesn't|didn't|do not)\\s+(?:have|need)\\s+to\\b|\\bneedn't\\b"),
  item("modal_would", 26, "would (요청·의지·과거의 습관)", "Would you ~? / would + V", "중", "중학교 2학년", "He would take a walk every morning.", ["would", "would like", "과거 습관"], "\\b(?:would|wouldn't|'d)\\s+(?:not\\s|never\\s|always\\s|you\\s|like\\s)?[a-z]+"),
  item("modal_used_to", 26, "used to (과거의 습관·상태)", "used to + V", "중", "중학교 2학년", "There used to be a lake around here.", ["used to", "과거 습관", "~하곤 했다"], "\\bused\\s+to\\s+(?![a-z]+ing\\b)[a-z]+|\\bused to\\b"),
  item("modal_be_able_to", 26, "be able to / will be able to", "be able to + V", "중", "중학교 1학년", "I will be able to help you get to the party tonight.", ["be able to", "할 수 있다"], "\\b(?:be|am|is|are|was|were|been)\\s+(?:not\\s)?able\\s+to\\b"),
  item("modal_perfect", 26, "조동사 + have p.p.", "should / must / may / could have p.p.", "고", "고등학교 1학년", "I should have studied English grammar harder.", ["should have pp", "must have pp", "후회", "과거 추측"], "\\b(?:should|must|could|might|may|can't|couldn't|shouldn't)(?:\\s+not)?\\s+(?:have|'ve)\\s+" + PP + "\\b"),
  item("modal_progressive", 26, "조동사 + 진행형/추측", "can't be V-ing / might be ~", "고", "고등학교 1학년", "He can’t be working at this time.", ["추측", "can't be", "must be"], "\\b(?:must|can't|might|may|could)\\s+be\\s+[a-z]+"),
  item("modal_rather", 26, "would rather / rather than", "would rather + V / A rather than B", "고", "고등학교 1학년", "They’ll fight to the end rather than give up.", ["would rather", "rather than"], "\\brather than\\b|\\b(?:would|'d) rather\\b"),
  item("modal_suggest_should", 26, "주장·제안의 that (should)", "suggest / insist that S (should) V", "고", "고등학교 2학년", "He suggested that they (should) play baseball.", ["suggest", "insist", "당위"], "\\b(?:suggest|suggested|insist|insisted|demand|demanded|recommend)\\s+that\\b"),
  // 27. Coordinating
  item("conj_and_but_or", 27, "등위접속사 and / but / or / so", "A and B, A but B, A or B", "초", "초등 3~4학년", "They are my neighbors, but I don’t know them well.", ["등위접속사", "and", "but", "or", "so"], "\\b(?:and|but|or)\\b"),
  item("conj_correlative", 27, "상관접속사", "both A and B / either A or B / not only A but (also) B / neither A nor B", "중", "중학교 3학년", "It is not only beautiful but (also) useful.", ["상관접속사", "both and", "either or", "not only", "neither nor"], "\\b(?:both\\b[^,]*\\band|either\\b[^,]*\\bor|neither\\b[^,]*\\bnor|not only|not just)\\b"),
  item("conj_not_but", 27, "not A but B", "not A but B", "고", "고등학교 1학년", "He came not to complain, but to help us.", ["not but"], "\\bnot\\s+[a-z]+[^,]*,?\\s+but\\b"),
  // 28. Subordinating
  item("conj_time", 28, "시간의 접속사", "when / while / before / after / until / since", "중", "중학교 1학년", "When we arrived, she was talking on the phone.", ["시간 접속사", "when", "while", "until", "before", "after", "since"], "\\b(?:when|while|until|till|before|after|as soon as|every time|whenever)\\b"),
  item("conj_reason", 28, "이유의 접속사", "because / since / as", "초", "중학교 1학년", "He went to bed because he was sleepy.", ["이유", "because", "'cause", "since", "as"], "\\b(?:because|'cause|cause|'cos|cuz)\\b"),
  item("conj_concession", 28, "양보의 접속사", "though / although / even if", "중", "중학교 2학년", "Although/Though it was cold, I went swimming.", ["양보", "though", "although", "even if", "even though"], "\\b(?:though|although|even if|even though)\\b"),
  item("conj_so_that", 28, "so that (목적) / so ~ that (결과)", "so that + S + can / so + 형용사 + that", "중", "중학교 3학년", "The weather was so nice that we went hiking.", ["so that", "so that 목적", "so 형용사 that", "결과"], "\\bso\\s+(?:that\\s)?(?:i|you|we|they|he|she|it)\\s+(?:can|could|will|would|won't|may)\\b|\\bso\\s+[a-z]+\\s+that\\b"),
  // 29. Conjunctive adverbials
  item("conj_adverb", 29, "접속부사", "however / therefore / on the other hand", "중", "중학교 3학년", "We believe he is the thief. However, we have no evidence against him.", ["접속부사", "however", "therefore", "instead"], "\\b(?:however|therefore|on the other hand|instead|besides|otherwise)\\b"),
  // 30. Relative clauses
  item("rel_subject_object", 30, "관계대명사 who / which / that", "선행사 + who/which/that + V / S + V", "중", "중학교 3학년", "The girl who is playing the piano is called Ann.", ["관계대명사", "who", "which", "that", "주격", "목적격", "관계사"], "\\b(?:one|ones|thing|things|someone|somebody|everyone|everything|anything|nothing|nobody|girl|boy|man|woman|person|people|friend|friends|love|place|time|way|song|world|heart|dream|the\\s[a-z]+|a\\s[a-z]+|all)\\s+(?:who|whom|which|that)\\s+[a-z]+|\\b(?:the one|the ones|someone|somebody|anyone)\\s+(?:who|that)\\b"),
  item("rel_whose", 30, "소유격 관계대명사 whose", "선행사 + whose + 명사", "중", "중학교 3학년", "I met the girl whose father is a musician.", ["whose", "소유격 관계대명사"], "\\b[a-z]+\\s+whose\\s+[a-z]+"),
  item("rel_omitted", 30, "목적격 관계대명사 생략", "선행사 + (that) + S + V", "중", "중학교 3학년", "This is the book (that) I bought yesterday.", ["관계대명사 생략", "목적격 생략"], "\\b(?:the one|the ones|someone|somebody|something|anything|everything|nothing|the (?:way|thing|things|place|man|girl|boy|love|time|song|world|life))\\s+(?:i|you|we|they|he|she)\\s+(?:\\w+ed|know|love|need|want|have|had|got|see|saw|used|found|made|left|lost|loved|remember)\\b"),
  item("rel_prep", 30, "전치사 + 관계대명사", "in which / with whom", "고", "고등학교 1학년", "The town in which I was born is very small.", ["전치사 관계대명사", "in which", "of which"], "\\b(?:in|on|at|of|for|with|to|from|by)\\s+(?:which|whom)\\b"),
  item("rel_adverb", 30, "관계부사 where / when / why / how", "the place where / the time when / the reason why", "고", "고등학교 1학년", "The house where she lives is very spacious.", ["관계부사", "where", "when", "why", "how"], "\\b(?:the\\s[a-z]+|place|places|time|times|day|days|night|reason|somewhere|anywhere|a\\splace|a\\stime|moment)\\s+(?:where|when|why)\\s+(?:i|you|we|they|he|she|it|there|the|my|your)\\b|\\b(?:this|that) is (?:why|how)\\b"),
  item("rel_nonrestrictive", 30, "관계사의 계속적 용법", ", who ~ / , which ~", "중", "중학교 3학년", "Mr. Lee, who teaches English, has two children.", ["계속적 용법", ", which", ", who"], ",\\s*(?:who|which)\\b"),
  item("rel_what", 30, "선행사를 포함한 관계대명사 what", "what + S + V (~하는 것)", "중", "중학교 3학년", "Nobody understood what she said about that plan.", ["what", "관계대명사 what", "~하는 것"], "\\bwhat\\s+(?:i|you|he|she|we|they|it)\\s+(?!is\\b|are\\b)[a-z]+|\\bwhat\\s+(?:makes?|made|doesn't|don't|matters?|keeps?)\\b|\\bthat's what\\b"),
  item("rel_compound", 30, "복합관계사 whoever / whatever", "whoever / whatever / wherever / whenever", "고", "고등학교 2학년", "Whoever wins this game will win the World Cup.", ["복합관계사", "whoever", "whatever", "wherever", "whenever"], "\\b(?:whoever|whatever|wherever|whenever|whichever)\\b"),
  // 31. Postmodification
  item("post_adj", 31, "-thing + 형용사", "something / nothing + 형용사", "중", "중학교 2학년", "Something strange happened last night.", ["후치수식", "something 형용사"], "\\b(?:something|nothing|anything|everything|someone|somebody|anyone|nobody|no one)\\s+(?:new|special|different|strange|real|good|better|wrong|else|beautiful|true|more|like)\\b"),
  item("post_participle", 31, "분사의 후치 수식", "명사 + V-ing ~ / 명사 + p.p. ~", "중", "중학교 3학년", "At the station I met a lady carrying a large umbrella.", ["분사", "현재분사", "과거분사", "명사 수식", "후치수식"], "\\b(?:a|an|the|my|your|those|these)\\s+[a-z]+\\s+(?:[a-z]+ing)\\s+(?:in|on|at|to|with|for|from|by|down|up|into|around|alone|through|a|an|the|my|your)\\b|\\b[a-z]+\\s+(?:made|called|named|given|left|found|broken|born|written|lost|hidden|frozen)\\s+(?:by|in|of|on|for|from|with)\\b"),
  item("participle_adj", 31, "감정 분사 (-ing / -ed 형용사)", "exciting / excited, boring / bored", "중", "중학교 2학년", "I’m interested in watching horror movies.", ["감정분사", "excited", "exciting", "bored", "tired"], "\\b(?:excited|exciting|bored|boring|tired|tiring|interested|interesting|surprised|surprising|amazed|amazing|scared|scary|worried|confused|frozen|broken|lost)\\b", true),
  // 32. Adverbial participles
  item("participle_clause", 32, "분사구문", "V-ing ~, S + V / (Being) p.p. ~, S + V", "중", "고등학교 1학년", "Walking along the street, I met an old friend.", ["분사구문", "ing 콤마", "having pp", "with 분사"], "^\\s*(?:[A-Za-z]+ing|having\\s[a-z]+|being\\s[a-z]+)\\b[^,]*,|\\bwith\\s+(?:the\\s|my\\s|your\\s)?[a-z]+\\s+[a-z]+ing\\b"),
  // 33. Stance markers
  item("stance", 33, "문장 전체를 꾸미는 부사·표현", "personally / frankly speaking / unfortunately", "중", "중학교 3학년", "Unfortunately, they couldn’t make it.", ["문장부사", "frankly", "honestly", "unfortunately", "luckily"], "\\b(?:personally|frankly|unfortunately|honestly|luckily|fortunately|surely|clearly|obviously|hopefully|truly|to be honest|to be sure)\\b"),
  // 34. Ellipsis
  item("ellipsis", 34, "생략", "반복되는 주어·동사·to 뒤 동사의 생략", "중", "고등학교 1학년", "Kevin understands the problem better than Amy (does).", ["생략", "대동사"]),
  // 35. Inversion
  item("inv_here_there", 35, "장소·방향 부사 도치", "Here comes ~ / Down came ~", "중", "중학교 2학년", "Here comes the bus.", ["도치", "here comes", "there goes"], "^\\s*(?:here|there|down|up|out|in|away|off)\\s+(?:comes?|came|goes|go|went)\\b|\\bhere\\s+(?:i|you|he|she|we|they|it)\\s+(?:go|come|comes|am|are|is)\\b"),
  item("inv_so_neither", 35, "so / neither + 동사 + 주어", "so do I / neither did she", "중", "중학교 3학년", "I enjoyed the play and so did my friends.", ["so do i", "neither", "nor", "도치"], "\\b(?:so|neither|nor)\\s+(?:do|does|did|am|is|are|was|were|have|has|can|will|would|could)\\s+(?:i|you|he|she|we|they|my|the|our|your)\\b"),
  item("inv_negative", 35, "부정어·강조어구 도치", "Never have I ~ / Not a word did he say", "고", "고등학교 2학년", "Not a word did he say.", ["부정어 도치", "never have i", "only then"], "^\\s*(?:never|not|no|little|only|rarely|seldom|nowhere|hardly|so)\\b[^,]*\\b(?:do|does|did|have|has|had|will|can|could|would|am|is|are|was|were)\\s+(?:i|you|he|she|we|they|it)\\b"),
  // 36. There
  item("there_be", 36, "There is / There are", "There + be + 명사", "초", "초등 3~4학년", "There are two books on the desk.", ["there is", "there are", "there's", "유도부사"], "\\bthere(?:'s|'re| is| are| was| were| will be| 'll be| be| have been| has been| must be| might be| used to be| ain't| isn't| aren't)\\b"),
  item("there_be_ing", 36, "There + be + 명사 + V-ing/p.p.", "There were several men running ~", "중", "중학교 3학년", "There were several men running in the park.", ["there be ing", "there have been"], "\\bthere(?:'s| is| are| was| were| have been| has been)\\s+[a-z]+\\s+[a-z]+\\s+(?:[a-z]+ing|" + PP + ")\\b"),
  // 37. Focus
  item("emph_do", 37, "강조의 do", "do / does / did + 동사원형", "중", "중학교 3학년", "I do hope you will succeed.", ["강조 do", "do 강조"], "\\b(?:i|you|we|they|he|she)\\s+(?:do|does|did)\\s+(?!not\\b|n't\\b)(?:love|hope|care|know|need|want|believe|miss|like|feel|think|wish)\\b"),
  item("emph_it_that", 37, "It is ~ that 강조구문", "It is/was + 강조어 + that/who ~", "고", "고등학교 1학년", "It was Justin who/that told me the truth.", ["강조구문", "it that", "it is that"], "\\bit(?:'s| is| was)\\s+(?:not\\s)?(?:you|me|him|her|them|us|[a-z]+\\s[a-z]+|[a-z]+)\\s+(?:that|who)\\s+(?:i|you|we|they|he|she|[a-z]+s|made|makes|told)\\b"),
  item("emph_what", 37, "What 강조 (What I need is ~)", "What + S + V + is ~", "고", "고등학교 1학년", "What we need is more time.", ["what 강조", "what i need is"], "^\\s*(?:and\\s|but\\s|'cause\\s)?(?:all\\s)?what\\s+[a-z]+\\s+[a-z]+\\b[^.]*\\b(?:is|was)\\b|\\ball (?:i|you|we) (?:want|need|know|have)\\b"),
  // 38. Anticipatory it
  item("it_to_inf", 38, "가주어 It ~ to부정사", "It is + 형용사 + (for 목적격) + to V", "중", "중학교 2학년", "It is important to protect our environment.", ["가주어", "진주어", "it to", "it is easy to"], "\\bit(?:'s| is| was| isn't| wasn't| would be| will be| feels)\\s+(?:so\\s|too\\s|very\\s|not\\s|really\\s)?[a-z]+\\s+(?:for\\s(?:me|you|him|her|us|them|\\w+)\\s+|of\\s(?:me|you|him|her|us|them)\\s+)?to\\s+[a-z]+"),
  item("it_of", 38, "It is + 성격 형용사 + of + 목적격 + to V", "It was kind of you to ~", "중", "중학교 3학년", "It was kind of you to help us.", ["of 의미상 주어", "kind of you"], "\\bit(?:'s| is| was)\\s+(?:so\\s|very\\s)?(?:kind|nice|sweet|silly|foolish|wise|smart|stupid|rude|brave|generous|clever)\\s+of\\b"),
  item("it_that", 38, "가주어 It ~ that절", "It is + 형용사 + that + S + V", "중", "중학교 3학년", "It is strange that you don’t know such a thing.", ["가주어 that", "it that"], "\\bit(?:'s| is| was)\\s+(?:so\\s|very\\s|too\\s)?(?:strange|true|clear|sad|funny|good|bad|important|obvious|possible|lucky|amazing|crazy|a shame|a pity)\\s+that\\b"),
  item("it_object", 38, "가목적어 it", "find / make / think + it + 형용사 + to V/that", "중", "중학교 3학년", "She found it exciting to learn new things.", ["가목적어", "find it", "make it"], "\\b(?:find|found|make|made|makes|think|thought|feel|felt|consider)\\s+it\\s+[a-z]+\\s+(?:for\\s\\w+\\s)?(?:to|that)\\b"),
  // 39. Appositives
  item("appositive", 39, "동격 (명사, 명사 / the fact that)", "A, B ~ / the fact that ~ / the dream of V-ing", "중", "고등학교 1학년", "The fact that Melissa was late didn’t surprise me.", ["동격", "the fact that", "동격의 that"], "\\b(?:the fact|the idea|the news|the hope|the dream|the belief|the feeling|the thought|the promise|the chance)\\s+(?:that|of)\\b"),
  // 40. Passive
  item("pass_basic", 40, "수동태 기본", "be + p.p. (+ by 행위자)", "중", "중학교 2학년", "The novel was written by Mark Twain.", ["수동태", "be pp", "by", "수동"], "\\b(?:am|is|are|was|were|be|been|being|'m|'re|isn't|aren't|wasn't|weren't|get|gets|got|getting)\\s+(?:not\\s|never\\s|so\\s|just\\s|all\\s|still\\s|always\\s)?" + PP + "\\b"),
  item("pass_modal", 40, "조동사 수동태", "will / can / should + be + p.p.", "중", "중학교 3학년", "Cooper will be invited to today’s meeting.", ["조동사 수동태", "will be pp", "can be pp", "won't be"], "\\b(?:will|won't|'ll|can|can't|could|should|must|may|might|would)\\s+(?:not\\s|never\\s)?be\\s+" + PP + "\\b"),
  item("pass_dative", 40, "4형식 수동태", "S + be + p.p. + 직접목적어 / 직접목적어 + be p.p. + to", "중", "중학교 3학년", "Stella was given a prize.", ["4형식 수동태", "was given"], "\\b(?:am|is|are|was|were|be|been)\\s+(?:given|shown|told|taught|sent|offered|asked)\\b"),
  item("pass_perfect", 40, "완료 수동태", "have/has been + p.p.", "고", "고등학교 1학년", "The monkey has been raised by human parents for years.", ["완료 수동태", "have been pp"], "\\b(?:have|has|had|'ve|'s)\\s+(?:never\\s|always\\s|just\\s)?been\\s+" + PP + "\\b"),
  item("pass_causative", 40, "5형식·사역·지각동사 수동태", "be made to V / be seen to V", "고", "고등학교 2학년", "I was made to clean the room.", ["be made to", "be seen to", "사역 수동태"], "\\b(?:am|is|are|was|were|be|been)\\s+(?:made|seen|heard|told|asked|forced|allowed|expected)\\s+to\\s+[a-z]+"),
  item("pass_born", 40, "be born / be meant to 등 수동 관용 표현", "be born (to V) / be meant to V / be made for", "중", "중학교 3학년", "(확장 예문) We were born to shine.", ["born", "meant to", "made for", "be born"], "\\b(?:am|is|are|was|were|be|been|'m|'re)\\s+(?:not\\s|just\\s)?(?:born|meant|made for|supposed to)\\b", true),
];

/* ---------- 검색 ---------- */

const ALIASES = [
  ["to부정사", ["to 부정사", "부정사", "투부정사", "infinitive"]],
  ["동명사", ["gerund", "ing"]],
  ["수동태", ["수동", "passive", "피동"]],
  ["관계대명사", ["관계사", "relative", "관대"]],
  ["가정법", ["subjunctive", "unreal", "가정"]],
  ["현재완료", ["완료", "perfect", "have pp", "have p.p."]],
  ["진행형", ["progressive", "진행", "ing"]],
  ["조동사", ["modal", "modals"]],
  ["비교급", ["비교", "comparative"]],
  ["최상급", ["superlative"]],
  ["사역동사", ["사역", "causative"]],
  ["지각동사", ["지각", "perception"]],
  ["간접의문문", ["간접 의문", "indirect question"]],
  ["간접화법", ["화법", "reported speech", "indirect speech"]],
  ["분사구문", ["분사", "participle"]],
  ["접속사", ["conjunction"]],
  ["명령문", ["imperative", "명령"]],
  ["감탄문", ["exclamation", "감탄"]],
  ["의문문", ["question", "의문"]],
  ["부정문", ["negation", "부정"]],
  ["도치", ["inversion"]],
  ["강조", ["emphasis", "focus"]],
  ["가주어", ["진주어", "anticipatory"]],
  ["동격", ["appositive"]],
  ["조건문", ["조건", "conditional"]],
  ["시제", ["tense"]],
];

export function normalize(s) {
  return String(s || "").toLowerCase().replace(/[\s·.,/()'’"~\-+!?:]+/g, "");
}

function expandQuery(q) {
  const n = normalize(q);
  const out = new Set([n]);
  ALIASES.forEach(([main, list]) => {
    const all = [main, ...list].map(normalize);
    if (all.some((a) => a && (n.includes(a) || (a.includes(n) && n.length >= 2)))) {
      all.forEach((a) => out.add(a));
    }
  });
  return Array.from(out).filter(Boolean);
}

export function categoryOf(itemOrNo) {
  const no = typeof itemOrNo === "number" ? itemOrNo : itemOrNo.cat;
  return CATEGORIES.find((c) => c.no === no);
}

/** 표현 검색 — 한글 이름, 영어 형태, 교육과정 범주명, 예문, 별칭 모두에서 찾습니다. */
export function searchGrammar(query, limit = 30) {
  const raw = String(query || "").trim();
  if (!raw) return [];
  const terms = expandQuery(raw);
  const results = [];
  GRAMMAR_ITEMS.forEach((it) => {
    const cat = categoryOf(it);
    const fields = {
      label: normalize(it.label),
      form: normalize(it.form),
      cat: normalize(cat.ko + cat.en),
      kw: it.keywords.map(normalize),
      ex: normalize(it.example),
    };
    let score = 0;
    terms.forEach((t, idx) => {
      const w = idx === 0 ? 1 : 0.6; // 원래 검색어 가중치가 더 큼
      if (fields.label === t) score += 100 * w;
      else if (fields.label.includes(t)) score += 60 * w;
      if (fields.form.includes(t)) score += 40 * w;
      if (fields.cat.includes(t)) score += 30 * w;
      if (fields.kw.some((k) => k === t)) score += 50 * w;
      else if (fields.kw.some((k) => k.includes(t) || (t.length >= 3 && t.includes(k) && k.length >= 3))) score += 25 * w;
      if (t.length >= 3 && fields.ex.includes(t)) score += 15 * w;
    });
    if (score > 0) results.push({ item: it, score });
  });
  results.sort((a, b) => b.score - a.score || a.item.cat - b.item.cat);
  return results.slice(0, limit).map((r) => r.item);
}

export function getGrammar(id) {
  return GRAMMAR_ITEMS.find((g) => g.id === id) || null;
}

export function levelLabel(level) {
  return level === "초" ? "초등부터" : level === "중" ? "중학교부터" : "고등학교부터";
}

export function makeCustomGrammar(text) {
  const t = String(text || "").trim();
  return {
    id: "custom",
    cat: 0,
    label: t,
    form: "",
    level: "중",
    grade: "중학교 3학년",
    example: "",
    keywords: [t],
    pattern: "",
    custom: true,
  };
}

/** 가사 한 줄에서 표현이 나타나는 위치들 [{start,end}] */
export function findGrammarRanges(item, line) {
  if (!item || !item.pattern || !line) return [];
  line = String(line).replace(/[’‘`´]/g, "'"); // 길이가 같은 문자로 바꿔 위치가 유지됨
  let re;
  try { re = new RegExp(item.pattern, "gi"); } catch (e) { return []; }
  const out = [];
  let m;
  let guard = 0;
  while ((m = re.exec(line)) !== null && guard++ < 20) {
    if (m[0].length === 0) { re.lastIndex++; continue; }
    out.push({ start: m.index, end: m.index + m[0].length });
  }
  return out;
}
