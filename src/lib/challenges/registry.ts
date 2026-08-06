import type {
  Difficulty,
  GeneratedChallenge,
  SubmissionType,
} from "./types";

/**
 * Config-driven challenge engine. Adding a new category = adding one entry
 * here plus one row in challenge_categories (see migrations/0003). No other
 * code changes are needed: generation, timers, submission handling,
 * evaluation, XP and UI all key off this config.
 */
export type CategoryConfig = {
  id: string;
  name: string;
  tagline: string;
  /** Three-letter designation shown in the brutalist UI, e.g. "SPK". */
  glyph: string;
  submissionType: SubmissionType;
  prepSeconds: Record<Difficulty, number>;
  workSeconds: Record<Difficulty, number>;
  xpReward: Record<Difficulty, number>;
  /** Rubric dimensions the evaluator scores 0-100. */
  dimensions: string[];
  /** Quiz-style categories are scored automatically without AI. */
  autoScored?: boolean;
  /** Extra instructions for the AI when generating a challenge. */
  generationGuidance: string;
  /** Extra instructions for the AI when evaluating a submission. */
  evaluationGuidance: string;
  /** Generated payload must include a quiz (reading, math, learning sprint). */
  needsQuiz?: boolean;
  /** Generated payload must include an article to read first. */
  needsArticle?: boolean;
  /** Procedural generator — used instead of AI (mental math). */
  generateLocal?: (difficulty: Difficulty) => GeneratedChallenge;
  /** Static pool used when no AI key is configured or the AI call fails. */
  fallbacks: Record<Difficulty, GeneratedChallenge[]>;
};

const MINUTE = 60;

function speakingFallbacks(
  topics: string[],
  minutes: string,
): GeneratedChallenge[] {
  return topics.map((topic) => ({
    title: topic,
    description: `Deliver a spoken piece on: "${topic}".`,
    instructions: `Prepare a clear structure (opening, 2-3 points, closing). Record yourself speaking for ${minutes}. Speak to the camera as if to a live audience. Avoid reading from notes.`,
  }));
}

function textFallbacks(
  prompts: { title: string; brief: string }[],
  instructions: string,
): GeneratedChallenge[] {
  return prompts.map((p) => ({
    title: p.title,
    description: p.brief,
    instructions,
  }));
}

/** Deterministic-enough PRNG for procedural math generation. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function generateMath(difficulty: Difficulty): GeneratedChallenge {
  const rand = rng(Date.now() ^ Math.floor(Math.random() * 0xffff));
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const count = difficulty === "easy" ? 10 : difficulty === "medium" ? 12 : 15;
  const quiz = Array.from({ length: count }, () => {
    if (difficulty === "easy") {
      const a = int(11, 99);
      const b = int(11, 99);
      return rand() > 0.5
        ? { question: `${a} + ${b} = ?`, answer: String(a + b) }
        : { question: `${a + b} - ${b} = ?`, answer: String(a) };
    }
    if (difficulty === "medium") {
      const roll = rand();
      if (roll < 0.4) {
        const a = int(12, 29);
        const b = int(3, 12);
        return { question: `${a} × ${b} = ?`, answer: String(a * b) };
      }
      if (roll < 0.7) {
        const b = int(3, 12);
        const q = int(12, 40);
        return { question: `${b * q} ÷ ${b} = ?`, answer: String(q) };
      }
      const a = int(101, 899);
      const b = int(101, 899);
      return { question: `${a} + ${b} = ?`, answer: String(a + b) };
    }
    const roll = rand();
    if (roll < 0.35) {
      const a = int(21, 99);
      const b = int(11, 29);
      return { question: `${a} × ${b} = ?`, answer: String(a * b) };
    }
    if (roll < 0.6) {
      const a = int(13, 31);
      return { question: `${a}² = ?`, answer: String(a * a) };
    }
    if (roll < 0.8) {
      const pct = int(1, 19) * 5;
      const base = int(4, 24) * 50;
      return {
        question: `${pct}% of ${base} = ?`,
        answer: String((pct * base) / 100),
      };
    }
    const a = int(1001, 8999);
    const b = int(1001, 8999);
    return { question: `${a} + ${b} = ?`, answer: String(a + b) };
  });

  return {
    title: `Mental Math Gauntlet // ${difficulty.toUpperCase()}`,
    description: `${count} arithmetic problems against the clock. No calculator, no paper.`,
    instructions:
      "Solve every problem in your head. Accuracy and speed both count — the leaderboard ranks score first, then completion time.",
    payload: { quiz },
  };
}

export const CATEGORY_REGISTRY: Record<string, CategoryConfig> = {
  "public-speaking": {
    id: "public-speaking",
    name: "Public Speaking",
    tagline: "Random topic. Ten minutes to prepare. Then the camera rolls.",
    glyph: "SPK",
    submissionType: "video",
    prepSeconds: { easy: 10 * MINUTE, medium: 10 * MINUTE, hard: 5 * MINUTE },
    workSeconds: { easy: 3 * MINUTE, medium: 3 * MINUTE, hard: 3 * MINUTE },
    xpReward: { easy: 80, medium: 120, hard: 180 },
    dimensions: [
      "Confidence",
      "Clarity",
      "Structure",
      "Speaking Speed",
      "Grammar",
      "Filler Words",
    ],
    generationGuidance:
      "Generate a single speech topic suitable for a 1-3 minute impromptu talk (e.g. 'Why Failure Is Important', 'AI Will Change Education', 'Best Travel Experience'). The description states the topic; the instructions tell the user to structure the talk with an opening, 2-3 supporting points and a closing.",
    evaluationGuidance:
      "The submission is the transcript of the user's recorded speech plus its duration. Judge confidence from assertive phrasing, clarity from sentence construction, speaking speed from words-per-minute (aim 110-160 wpm), and count filler words (um, uh, like, you know).",
    fallbacks: {
      easy: speakingFallbacks(
        ["My Best Travel Experience", "A Skill Everyone Should Learn", "The Best Advice I Ever Received"],
        "1-2 minutes",
      ),
      medium: speakingFallbacks(
        ["Why Failure Is Important", "AI Will Change Education", "Social Media: Net Good or Net Harm?"],
        "2-3 minutes",
      ),
      hard: speakingFallbacks(
        ["Climate Change Demands Individual Action", "The Future of Technology Is Not What You Think", "Defend an Opinion You Disagree With"],
        "3 minutes",
      ),
    },
  },

  writing: {
    id: "writing",
    name: "Writing",
    tagline: "One prompt. One deadline. Ship the draft.",
    glyph: "WRT",
    submissionType: "text",
    prepSeconds: { easy: 0, medium: 0, hard: 0 },
    workSeconds: { easy: 15 * MINUTE, medium: 20 * MINUTE, hard: 25 * MINUTE },
    xpReward: { easy: 60, medium: 100, hard: 150 },
    dimensions: ["Grammar", "Structure", "Creativity", "Readability", "Vocabulary"],
    generationGuidance:
      "Generate a writing prompt. Easy: a short personal piece (~150 words). Medium: a persuasive or descriptive piece (~300 words). Hard: an essay or short story with a constraint (~500 words, e.g. a required opening line or forbidden word).",
    evaluationGuidance:
      "The submission is the written piece. Score grammar, structure (intro/body/close), creativity, readability and vocabulary range. Quote at least one sentence in your feedback.",
    fallbacks: {
      easy: textFallbacks(
        [
          { title: "A Letter to Your Past Self", brief: "Write ~150 words to yourself five years ago. One concrete piece of advice." },
          { title: "Describe Your Morning Like a Thriller", brief: "Retell your morning routine (~150 words) in the style of a suspense novel." },
        ],
        "Write the piece in the editor before the timer runs out. Aim for a clear beginning, middle and end.",
      ),
      medium: textFallbacks(
        [
          { title: "Convince a Skeptic", brief: "In ~300 words, persuade a skeptic that a habit you value is worth adopting." },
          { title: "The City at 5 AM", brief: "A ~300 word descriptive piece about a city before it wakes up." },
        ],
        "Write the piece in the editor before the timer runs out. Structure matters: hook, argument or imagery, close.",
      ),
      hard: textFallbacks(
        [
          { title: "The Door Was Already Open", brief: "A ~500 word short story that must begin with the sentence: 'The door was already open.'" },
          { title: "Argue Both Sides", brief: "~500 words. Take a divisive topic, argue one side for half the piece, then genuinely argue the other." },
        ],
        "Write the piece in the editor before the timer runs out. Honour the constraint — it is part of the score.",
      ),
    },
  },

  coding: {
    id: "coding",
    name: "Coding",
    tagline: "A problem lands. The clock starts. Write the code.",
    glyph: "COD",
    submissionType: "code",
    prepSeconds: { easy: 0, medium: 0, hard: 0 },
    workSeconds: { easy: 20 * MINUTE, medium: 30 * MINUTE, hard: 45 * MINUTE },
    xpReward: { easy: 80, medium: 130, hard: 200 },
    dimensions: ["Correctness", "Code Quality", "Complexity", "Best Practices"],
    generationGuidance:
      "Generate a self-contained programming problem solvable in any language, with a precise problem statement, input/output examples, and at least one edge case to handle. Easy: string/array manipulation. Medium: hash maps, two pointers, recursion. Hard: dynamic programming, graphs, or non-trivial algorithm design.",
    evaluationGuidance:
      "The submission is source code (and optionally a repository link). Assess correctness against the stated problem (trace the examples), code quality (naming, structure), algorithmic complexity, and best practices. If the code would fail an example, say exactly where.",
    fallbacks: {
      easy: [
        {
          title: "Balanced Brackets",
          description: "Write a function that returns true if a string of (), [], {} brackets is balanced.",
          instructions: "Any language. Handle empty strings and interleaved brackets like '([)]' (which is NOT balanced). Paste your code, or a repo link plus the code.",
        },
      ],
      medium: [
        {
          title: "Group Anagrams",
          description: "Given a list of words, group the anagrams together and return the groups.",
          instructions: "Any language. State the time complexity of your approach in a comment. Paste your code, or a repo link plus the code.",
        },
      ],
      hard: [
        {
          title: "Coin Change",
          description: "Given coin denominations and a target amount, return the minimum number of coins needed, or -1 if impossible.",
          instructions: "Any language. Your solution must not be exponential — memoise or build bottom-up. Include the complexity in a comment. Paste your code, or a repo link plus the code.",
        },
      ],
    },
  },

  reading: {
    id: "reading",
    name: "Reading",
    tagline: "Read the article. Then prove you understood it.",
    glyph: "RDG",
    submissionType: "quiz",
    prepSeconds: { easy: 0, medium: 0, hard: 0 },
    workSeconds: { easy: 8 * MINUTE, medium: 10 * MINUTE, hard: 12 * MINUTE },
    xpReward: { easy: 50, medium: 90, hard: 140 },
    dimensions: ["Comprehension"],
    autoScored: true,
    needsQuiz: true,
    needsArticle: true,
    generationGuidance:
      "Write an original informative article (easy ~350 words, medium ~500, hard ~700) on an interesting factual topic (science, history, technology, psychology). Then create a comprehension quiz: 5 multiple-choice questions (4 options each) answerable ONLY from the article. Put the article in payload.article and the questions in payload.quiz.",
    evaluationGuidance: "Auto-scored comprehension quiz.",
    fallbacks: {
      easy: [
        {
          title: "The Octopus Brain",
          description: "Read a short article about distributed intelligence in octopuses, then answer a comprehension quiz.",
          instructions: "Read carefully — the quiz appears when the timer starts and the article stays visible.",
          payload: {
            article:
              "The octopus is unlike any other intelligent animal on Earth. Two-thirds of its roughly 500 million neurons are not in its head but in its arms. Each arm has its own cluster of neurons and can taste, touch, and act semi-independently — an arm separated from the body can still reach and grasp for a short time. Scientists call this a distributed nervous system.\n\nThis architecture changes how the octopus solves problems. When an octopus opens a jar, the central brain sets the goal, but much of the fine manipulation is delegated to the arms themselves. Researchers at the Hebrew University of Jerusalem showed that octopuses do not track the precise position of each arm the way humans track their limbs; instead they rely on vision and let the arms work out the details.\n\nOctopus intelligence evolved completely separately from vertebrate intelligence. Our last common ancestor, some 600 million years ago, was likely a simple worm. That makes the octopus the closest thing biologists have to an alien mind: a second, independent experiment in building complex cognition. Despite this, octopuses are short-lived — most survive only one to two years, and they die shortly after reproducing.",
            quiz: [
              { question: "Where are most of an octopus's neurons located?", options: ["In its central brain", "In its arms", "In its skin", "In its eyes"], answer: 1 },
              { question: "Roughly how many neurons does an octopus have?", options: ["5 million", "50 million", "500 million", "5 billion"], answer: 2 },
              { question: "How do octopuses track their arms when manipulating objects?", options: ["Precise internal position sense", "Echolocation", "They rely on vision", "Chemical signals in the water"], answer: 2 },
              { question: "What was the likely last common ancestor of humans and octopuses?", options: ["A fish", "A simple worm", "An early reptile", "A jellyfish"], answer: 1 },
              { question: "How long do most octopuses live?", options: ["One to two years", "Five to ten years", "Twenty years", "Fifty years"], answer: 0 },
            ],
          },
        },
      ],
      medium: [
        {
          title: "The Antikythera Mechanism",
          description: "Read an article about the world's oldest known analog computer, then answer a comprehension quiz.",
          instructions: "Read carefully — the quiz appears when the timer starts and the article stays visible.",
          payload: {
            article:
              "In 1901, sponge divers exploring a Roman-era shipwreck off the Greek island of Antikythera hauled up a corroded lump of bronze. It sat in a museum for months before an archaeologist noticed a gear wheel embedded in the rock — an impossibility, since precision gearing was thought to be a medieval invention. The object became known as the Antikythera mechanism, and a century of study has revealed it to be the most sophisticated machine surviving from antiquity.\n\nBuilt around 100 BC, the device contained at least 30 interlocking bronze gears. By turning a hand crank, its user could predict the positions of the sun and moon against the zodiac, the phases of the moon, and the timing of solar and lunar eclipses. It even tracked the four-year cycle of the Olympic games. The mechanism's eclipse predictions followed the Saros cycle, a period of roughly 18 years after which eclipses repeat.\n\nX-ray tomography in the 2000s allowed researchers to read inscriptions hidden inside the corroded layers — effectively a user manual engraved in Greek. The gearing implies a mathematical sophistication, including an early form of differential gearing, that would not reappear in the historical record for over a thousand years. No comparable device has ever been found, suggesting either that we lost an entire tradition of Greek engineering, or that this was a singular masterpiece.",
            quiz: [
              { question: "How was the Antikythera mechanism discovered?", options: ["An archaeological dig on Crete", "Sponge divers exploring a shipwreck", "A museum acquisition from a collector", "A farmer ploughing a field"], answer: 1 },
              { question: "Approximately when was the mechanism built?", options: ["500 BC", "100 BC", "200 AD", "800 AD"], answer: 1 },
              { question: "Which cycle did the mechanism use to predict eclipses?", options: ["The Metonic cycle", "The Saros cycle", "The Julian cycle", "The Sothic cycle"], answer: 1 },
              { question: "What technology revealed the inscriptions hidden inside it?", options: ["Carbon dating", "Ultrasound imaging", "X-ray tomography", "Infrared photography"], answer: 2 },
              { question: "Besides astronomy, what cycle did the mechanism track?", options: ["The Olympic games", "Roman elections", "Harvest seasons", "Tidal patterns"], answer: 0 },
            ],
          },
        },
      ],
      hard: [
        {
          title: "The Replication Crisis",
          description: "Read an article on the replication crisis in science, then answer a comprehension quiz.",
          instructions: "Read carefully — the quiz appears when the timer starts and the article stays visible.",
          payload: {
            article:
              "In 2015, the Open Science Collaboration published the results of an audacious project: 270 researchers had spent four years redoing 100 published psychology experiments. Only 36% of the replications produced statistically significant results, compared with 97% of the originals. The average effect size in the replications was roughly half that of the original studies. Psychology's 'replication crisis' had numbers.\n\nThe causes are structural rather than fraudulent. Journals prefer novel, positive results, so studies that find nothing tend to go unpublished — the file-drawer problem. Researchers, needing publications to survive professionally, face incentives to analyse data flexibly: testing many variables, stopping data collection when results look good, or reporting only the analyses that 'worked'. These practices, collectively called p-hacking, can manufacture statistical significance from noise. Crucially, a researcher can p-hack without intending to deceive; each small analytical choice can feel justified in isolation.\n\nReforms have followed. Pre-registration requires researchers to publicly specify their hypotheses and analysis plan before collecting data, removing the room for flexible analysis. Registered reports go further: journals peer-review the study design and commit to publishing the outcome before results exist, neutralising the bias toward positive findings. Large multi-lab collaborations now routinely test important findings across many sites. The crisis is uncomfortable, but many scientists argue it is better described as a correction — science's error-detection machinery finally being applied to itself.",
            quiz: [
              { question: "In the 2015 Open Science Collaboration project, what fraction of replications produced statistically significant results?", options: ["97%", "62%", "36%", "12%"], answer: 2 },
              { question: "What is the 'file-drawer problem'?", options: ["Lost raw data from old studies", "Null results going unpublished", "Journals rejecting long papers", "Researchers hiding conflicts of interest"], answer: 1 },
              { question: "According to the article, p-hacking requires deliberate intent to deceive.", options: ["True — it is always fraud", "False — it can happen through individually justified choices", "The article does not discuss intent", "True, but only in psychology"], answer: 1 },
              { question: "What do 'registered reports' commit journals to?", options: ["Publishing the study before peer review", "Publishing regardless of results, based on pre-reviewed design", "Publishing only successful replications", "Publishing raw data alongside papers"], answer: 1 },
              { question: "How does the article characterise the crisis in its conclusion?", options: ["As evidence science cannot be trusted", "As a problem confined to psychology", "As a correction — error-detection applied to science itself", "As the result of widespread fraud"], answer: 2 },
            ],
          },
        },
      ],
    },
  },

  "mental-math": {
    id: "mental-math",
    name: "Mental Math",
    tagline: "No calculator. No paper. Just you against the numbers.",
    glyph: "MTH",
    submissionType: "quiz",
    prepSeconds: { easy: 0, medium: 0, hard: 0 },
    workSeconds: { easy: 4 * MINUTE, medium: 5 * MINUTE, hard: 6 * MINUTE },
    xpReward: { easy: 40, medium: 80, hard: 130 },
    dimensions: ["Accuracy"],
    autoScored: true,
    needsQuiz: true,
    generationGuidance: "Procedurally generated — AI not used.",
    evaluationGuidance: "Auto-scored, ranked by accuracy then speed.",
    generateLocal: generateMath,
    fallbacks: {
      easy: [generateMath("easy")],
      medium: [generateMath("medium")],
      hard: [generateMath("hard")],
    },
  },

  interview: {
    id: "interview",
    name: "Interview Practice",
    tagline: "The question drops. Answer it out loud, under pressure.",
    glyph: "INT",
    submissionType: "audio",
    prepSeconds: { easy: 2 * MINUTE, medium: MINUTE, hard: 30 },
    workSeconds: { easy: 3 * MINUTE, medium: 3 * MINUTE, hard: 4 * MINUTE },
    xpReward: { easy: 70, medium: 110, hard: 170 },
    dimensions: ["Confidence", "Communication", "Structure", "Substance"],
    generationGuidance:
      "Generate one interview question. Easy: classic behavioural ('Tell me about yourself', 'Describe a challenge you overcame'). Medium: situational/behavioural requiring STAR structure. Hard: a curveball or case-style question ('Estimate…', 'Your team disagrees with your decision — walk me through what you do').",
    evaluationGuidance:
      "The submission is the transcript of a spoken interview answer. Judge confidence, communication, structure (did they use something like STAR?), and substance (specifics beat generalities). Flag rambling or an answer that never lands the point.",
    fallbacks: {
      easy: [
        { title: "Tell Me About Yourself", description: "The classic opener. 60-90 seconds, tailored as if for a role you actually want.", instructions: "Record your spoken answer. Structure: present → past → future. End on why this role." },
      ],
      medium: [
        { title: "A Time You Failed", description: "Describe a real failure and what you changed because of it.", instructions: "Record your spoken answer using STAR: Situation, Task, Action, Result. The result should include what you do differently now." },
      ],
      hard: [
        { title: "Your Team Disagrees With You", description: "You made a call. Your whole team thinks it's wrong. Walk through what you do next.", instructions: "Record your spoken answer. Address: how you test whether you're wrong, how you communicate, and when you would reverse the decision." },
      ],
    },
  },

  language: {
    id: "language",
    name: "Language Practice",
    tagline: "Speak the language you're learning. Out loud. Now.",
    glyph: "LNG",
    submissionType: "audio",
    prepSeconds: { easy: 2 * MINUTE, medium: MINUTE, hard: MINUTE },
    workSeconds: { easy: 2 * MINUTE, medium: 3 * MINUTE, hard: 3 * MINUTE },
    xpReward: { easy: 60, medium: 100, hard: 150 },
    dimensions: ["Fluency", "Grammar", "Vocabulary", "Coherence"],
    generationGuidance:
      "Generate a conversation topic for spoken practice in ANY target language the user is learning (the topic is given in English; the user speaks in their target language). Easy: introduce yourself / describe your day. Medium: narrate a past event or give opinions. Hard: debate a position or tell a story with a twist.",
    evaluationGuidance:
      "The submission is a transcript of speech in the user's target language (the transcript may be auto-transcribed and imperfect — be charitable about transcription artifacts). Evaluate fluency (flow, connectors), grammar, vocabulary range, and coherence. Give 2-3 concrete phrases they could have used.",
    fallbacks: {
      easy: [
        { title: "Introduce Yourself", description: "In your target language: who you are, where you live, what you do, one hobby.", instructions: "Record yourself speaking in your target language for 1-2 minutes. Note which language you are practising in the notes field." },
      ],
      medium: [
        { title: "Yesterday, Retold", description: "In your target language, narrate what you did yesterday — past tense practice.", instructions: "Record 2-3 minutes in your target language. Use at least five past-tense verbs. Note the language in the notes field." },
      ],
      hard: [
        { title: "Defend an Opinion", description: "Pick something you believe (e.g. 'cities are better than villages') and argue it in your target language.", instructions: "Record 3 minutes in your target language. Use connectors (however, therefore, on the other hand). Note the language in the notes field." },
      ],
    },
  },

  fitness: {
    id: "fitness",
    name: "Fitness",
    tagline: "A physical task with a deadline. Sweat is the proof.",
    glyph: "FIT",
    submissionType: "image",
    prepSeconds: { easy: 0, medium: 0, hard: 0 },
    workSeconds: { easy: 15 * MINUTE, medium: 25 * MINUTE, hard: 40 * MINUTE },
    xpReward: { easy: 50, medium: 90, hard: 140 },
    dimensions: ["Completion", "Effort", "Honesty of Report"],
    generationGuidance:
      "Generate a bodyweight workout requiring no equipment. Easy: ~10 min (e.g. 3 rounds of squats/push-ups/plank). Medium: ~20 min circuit. Hard: ~30 min with a rep target. Include exact exercises, reps and rounds in the instructions.",
    evaluationGuidance:
      "The submission is the user's completion report: what they did, rounds/reps completed, how it felt, plus a proof description (photo of workout spot / fitness tracker). Judge completion against the prescription and the specificity of the report — vague reports score low.",
    fallbacks: {
      easy: [
        { title: "The 3-Round Starter", description: "3 rounds: 15 squats, 10 push-ups (knees fine), 30s plank.", instructions: "Complete all 3 rounds before the timer ends. Then report exactly what you completed, and describe your proof (photo, tracker screenshot)." },
      ],
      medium: [
        { title: "The 20-Minute Circuit", description: "AMRAP 20 min: 10 burpees, 15 squats, 10 lunges/leg, 20 mountain climbers.", instructions: "As many rounds as possible in 20 minutes. Report your round count honestly and describe your proof." },
      ],
      hard: [
        { title: "The 300 Club", description: "Complete 300 total reps: 100 squats, 100 push-ups (any variation), 100 sit-ups.", instructions: "Split the reps however you like before the timer ends. Report your splits and describe your proof." },
      ],
    },
  },

  creativity: {
    id: "creativity",
    name: "Creativity",
    tagline: "Constraints breed invention. You get both.",
    glyph: "CRE",
    submissionType: "text",
    prepSeconds: { easy: 0, medium: 0, hard: 0 },
    workSeconds: { easy: 10 * MINUTE, medium: 15 * MINUTE, hard: 20 * MINUTE },
    xpReward: { easy: 50, medium: 90, hard: 140 },
    dimensions: ["Originality", "Constraint Adherence", "Execution"],
    generationGuidance:
      "Generate a creative challenge with a hard constraint, e.g.: write a 6-word story ×5; invent a product for an absurd problem and pitch it; describe a colour to someone who cannot see; write a dialogue where neither speaker says what they mean. The constraint must be checkable.",
    evaluationGuidance:
      "Judge originality (would ten other people produce this?), adherence to the stated constraint (violations cap the score at 50), and execution quality.",
    fallbacks: {
      easy: [
        { title: "Six-Word Stories × 5", description: "Write five complete stories, each exactly six words.", instructions: "Each line must be exactly six words and imply a larger story. Number them 1-5." },
      ],
      medium: [
        { title: "Invent & Pitch", description: "Invent a product that solves a problem nobody has, and pitch it seriously.", instructions: "Name the product, describe the 'problem', and write a straight-faced 150-word pitch. Comedy through commitment." },
      ],
      hard: [
        { title: "The Unsaid Dialogue", description: "Write a dialogue where neither character ever says what they actually mean.", instructions: "10-20 lines of dialogue. The reader must be able to infer the real conversation underneath. No narration allowed." },
      ],
    },
  },

  "sales-pitch": {
    id: "sales-pitch",
    name: "Sales Pitch",
    tagline: "Sixty seconds to make someone care. Sell it.",
    glyph: "SLS",
    submissionType: "video",
    prepSeconds: { easy: 5 * MINUTE, medium: 5 * MINUTE, hard: 3 * MINUTE },
    workSeconds: { easy: 2 * MINUTE, medium: 2 * MINUTE, hard: 90 },
    xpReward: { easy: 70, medium: 110, hard: 170 },
    dimensions: ["Hook", "Persuasiveness", "Clarity", "Call To Action"],
    generationGuidance:
      "Generate a sales pitch scenario: a product or idea (real, mundane, or absurd) to pitch to a specified audience. Easy: everyday product to a friendly buyer. Medium: a service to a skeptical customer. Hard: an absurd or unsellable item to a hostile audience (sell a pencil to a keyboard manufacturer).",
    evaluationGuidance:
      "The submission is the transcript of a recorded pitch. Judge the hook (first two sentences), persuasiveness (benefits over features, objection handling), clarity, and whether it ends with a concrete call to action.",
    fallbacks: {
      easy: [
        { title: "Pitch Your Favourite App", description: "Sell an app you genuinely use to someone who has never heard of it.", instructions: "Record a 60-90 second pitch. Open with a hook, one core benefit, end with a call to action." },
      ],
      medium: [
        { title: "Sell the Gym in January... in June", description: "Pitch a gym membership to someone whose new-year motivation died months ago.", instructions: "Record a 60-90 second pitch. Handle the obvious objection ('I quit last time') head-on." },
      ],
      hard: [
        { title: "Sell This Pencil", description: "Sell an ordinary pencil to a company that manufactures keyboards.", instructions: "Record a 90 second pitch. No gimmick discounts — find a real angle. End with a specific ask." },
      ],
    },
  },

  "problem-solving": {
    id: "problem-solving",
    name: "Problem Solving",
    tagline: "A messy problem. A clean written plan. Go.",
    glyph: "PRB",
    submissionType: "text",
    prepSeconds: { easy: 0, medium: 0, hard: 0 },
    workSeconds: { easy: 10 * MINUTE, medium: 15 * MINUTE, hard: 20 * MINUTE },
    xpReward: { easy: 60, medium: 100, hard: 160 },
    dimensions: ["Structure", "Reasoning", "Practicality", "Trade-off Awareness"],
    generationGuidance:
      "Generate an open-ended reasoning problem: an estimation (Fermi) question, a logistics puzzle, or a decision scenario with competing constraints. It must have no single right answer but reward structured reasoning.",
    evaluationGuidance:
      "The submission is a written solution. Judge the structure (did they decompose the problem?), the reasoning chain (are estimates and assumptions explicit?), practicality, and whether trade-offs were acknowledged. Reward explicit assumptions over lucky guesses.",
    fallbacks: {
      easy: [
        { title: "How Many Piano Tuners?", description: "Estimate how many piano tuners work in your city.", instructions: "Write your estimate. Show every assumption and the arithmetic chain. The method is the score, not the number." },
      ],
      medium: [
        { title: "The Overbooked Day", description: "You have 5 commitments tomorrow that total 14 hours, in 10 available hours. Design the least-damage plan.", instructions: "Invent plausible details for the 5 commitments, then write your triage: what moves, what's cut, what's delegated, and why." },
      ],
      hard: [
        { title: "Launch With Half the Budget", description: "Your product launch budget was just cut 50% two weeks before launch. Re-plan it.", instructions: "Define the (invented) original plan in 3 lines, then write the revised plan: what you cut, what you keep, the one risk you accept, and the metric you protect." },
      ],
    },
  },

  "social-confidence": {
    id: "social-confidence",
    name: "Social Confidence",
    tagline: "A real-world social mission. Leave the app. Do the thing.",
    glyph: "SOC",
    submissionType: "text",
    prepSeconds: { easy: 0, medium: 0, hard: 0 },
    workSeconds: { easy: 60 * MINUTE, medium: 90 * MINUTE, hard: 120 * MINUTE },
    xpReward: { easy: 70, medium: 120, hard: 180 },
    dimensions: ["Completion", "Courage", "Reflection"],
    generationGuidance:
      "Generate a small real-world social mission that is safe, legal and considerate. Easy: give a genuine compliment to a stranger or service worker. Medium: start a short conversation with someone new; ask a shop assistant for a recommendation and follow it. Hard: make a small reasonable request that risks a 'no' (ask for a discount, ask someone to swap seats politely). Never generate anything harassing or unsafe.",
    evaluationGuidance:
      "The submission is a written report of a real-world social interaction. Judge completion (did they actually do the mission as described — specifics like place, words used, the other person's response), courage relative to the mission, and quality of reflection. Vague, generic reports score low.",
    fallbacks: {
      easy: [
        { title: "The Genuine Compliment", description: "Give one specific, genuine compliment to a stranger or service worker today.", instructions: "Do it in the real world, then report: where, what you said (verbatim), how they reacted, how it felt." },
      ],
      medium: [
        { title: "Ask For a Recommendation", description: "Ask a barista, bookseller or shop assistant for their personal recommendation — and take it.", instructions: "Do it, then report the conversation, what you walked away with, and one thing you noticed about the interaction." },
      ],
      hard: [
        { title: "Risk a No", description: "Make one small, polite request today that could plausibly be refused (a discount, a better table, a favour).", instructions: "Do it, then report: your exact ask, the answer, and what the anticipation felt like versus the reality." },
      ],
    },
  },

  "learning-sprint": {
    id: "learning-sprint",
    name: "Learning Sprint",
    tagline: "Learn one thing fast. Then teach it back.",
    glyph: "LRN",
    submissionType: "text",
    prepSeconds: { easy: 0, medium: 0, hard: 0 },
    workSeconds: { easy: 20 * MINUTE, medium: 30 * MINUTE, hard: 45 * MINUTE },
    xpReward: { easy: 60, medium: 100, hard: 150 },
    dimensions: ["Understanding", "Clarity of Explanation", "Depth"],
    generationGuidance:
      "Generate a focused learning sprint: name a specific concept the user should research and then explain in their own words as if teaching a smart 15-year-old (Feynman technique). Easy: a single concrete concept (why the sky is blue, how compound interest works). Medium: a mechanism (how vaccines train immunity, how public-key crypto works conceptually). Hard: a contested or subtle idea (Gödel's incompleteness in plain terms, why P vs NP matters).",
    evaluationGuidance:
      "The submission is the user's own explanation of the concept after researching it. Judge understanding (are the core mechanics right?), clarity (could a 15-year-old follow it?), and depth (analogies, edge cases, limits of the idea). Penalise copy-paste-sounding text.",
    fallbacks: {
      easy: [
        { title: "Compound Interest, Explained", description: "Research how compound interest works, then explain it from scratch.", instructions: "Spend up to half the timer researching. Then write your own explanation for a smart 15-year-old, with one worked example. No copy-paste." },
      ],
      medium: [
        { title: "How Vaccines Train Immunity", description: "Research how vaccines work, then teach it back in your own words.", instructions: "Spend up to half the timer researching. Explain the mechanism with one analogy of your own invention. No copy-paste." },
      ],
      hard: [
        { title: "Why P vs NP Matters", description: "Research the P vs NP problem, then explain what it claims and why anyone should care.", instructions: "Spend up to half the timer researching. Your explanation must include: what P and NP mean informally, one everyday example, and what changes if P=NP. No copy-paste." },
      ],
    },
  },
};

export const CATEGORY_IDS = Object.keys(CATEGORY_REGISTRY);

export function getCategory(id: string): CategoryConfig | null {
  return CATEGORY_REGISTRY[id] ?? null;
}

export function pickFallback(
  config: CategoryConfig,
  difficulty: Difficulty,
): GeneratedChallenge {
  if (config.generateLocal) return config.generateLocal(difficulty);
  const pool = config.fallbacks[difficulty];
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Deterministic daily category rotation (same for all users on a given day). */
export function dailyCategoryId(date: Date): string {
  const day = Math.floor(date.getTime() / 86_400_000);
  return CATEGORY_IDS[day % CATEGORY_IDS.length];
}
