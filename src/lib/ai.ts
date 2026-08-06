import type { CategoryConfig } from "./challenges/registry";
import { pickFallback } from "./challenges/registry";
import type {
  Attempt,
  Difficulty,
  Evaluation,
  GeneratedChallenge,
  QuizQuestion,
  SubmissionInput,
} from "./challenges/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-sonnet-4";

function getApiKey(env: CloudflareEnv): string | null {
  return (
    env.OPENROUTER_API_KEY ??
    process.env.OPENROUTER_API_KEY ??
    null
  );
}

function getModel(env: CloudflareEnv): string {
  return (
    env.OPENROUTER_MODEL ??
    process.env.OPENROUTER_MODEL ??
    DEFAULT_MODEL
  );
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("No JSON object in model response");
  }
}

/**
 * Calls OpenRouter with a JSON schema. Returns null on failure so callers
 * can fall back to static challenges / heuristic scoring.
 */
async function structuredCall<T>(
  env: CloudflareEnv,
  args: { system: string; prompt: string; schema: Record<string, unknown> },
): Promise<T | null> {
  const apiKey = getApiKey(env);
  if (!apiKey) return null;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.AUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000",
        "X-Title": "Challenge App",
      },
      body: JSON.stringify({
        model: getModel(env),
        temperature: 0.8,
        messages: [
          {
            role: "system",
            content: `${args.system}\n\nRespond with valid JSON only. Match this schema:\n${JSON.stringify(args.schema)}`,
          },
          { role: "user", content: args.prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "challenge_result",
            strict: true,
            schema: args.schema,
          },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("OpenRouter error:", response.status, body);
      return null;
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    return extractJson(content) as T;
  } catch (error) {
    console.error("OpenRouter call failed:", error);
    return null;
  }
}

function buildGenerationSchema(config: CategoryConfig) {
  const properties: Record<string, unknown> = {
    title: { type: "string", description: "Short, punchy challenge title" },
    description: {
      type: "string",
      description: "1-3 sentences describing the challenge",
    },
    instructions: {
      type: "string",
      description: "Precise instructions for completing and submitting",
    },
  };
  const required = ["title", "description", "instructions"];

  if (config.needsArticle) {
    properties.article = { type: "string", description: "The full article text" };
    required.push("article");
  }
  if (config.needsQuiz) {
    properties.quiz = {
      type: "array",
      description: "Exactly 5 multiple-choice questions with 4 options each",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "options", "answer"],
        properties: {
          question: { type: "string" },
          options: {
            type: "array",
            items: { type: "string" },
            minItems: 4,
            maxItems: 4,
          },
          answer: {
            type: "integer",
            description: "Zero-based index of the correct option",
          },
        },
      },
    };
    required.push("quiz");
  }

  return { type: "object", additionalProperties: false, required, properties };
}

type RawGeneration = {
  title: string;
  description: string;
  instructions: string;
  article?: string;
  quiz?: { question: string; options: string[]; answer: number }[];
};

export async function generateChallenge(
  env: CloudflareEnv,
  config: CategoryConfig,
  difficulty: Difficulty,
  recentTitles: string[],
): Promise<{ challenge: GeneratedChallenge; aiGenerated: boolean }> {
  if (config.generateLocal) {
    return { challenge: config.generateLocal(difficulty), aiGenerated: false };
  }

  if (!getApiKey(env)) {
    return { challenge: pickFallback(config, difficulty), aiGenerated: false };
  }

  const avoid =
    recentTitles.length > 0
      ? `\n\nThe user recently received these challenges — generate something clearly different:\n${recentTitles.map((t) => `- ${t}`).join("\n")}`
      : "";

  const result = await structuredCall<RawGeneration>(env, {
    system:
      "You generate challenges for an accountability app that forces users to complete real-world tasks under a timer and submit proof. Challenges must be specific, self-contained, achievable within the time limit, and safe. Never require spending money, dangerous activity, or interactions that could harass anyone.",
    prompt: `Generate one ${difficulty.toUpperCase()} difficulty challenge for the "${config.name}" category.

Category guidance: ${config.generationGuidance}

Time the user gets to complete it: ${Math.round(config.workSeconds[difficulty] / 60)} minutes${config.prepSeconds[difficulty] > 0 ? ` (plus ${Math.round(config.prepSeconds[difficulty] / 60)} minutes preparation)` : ""}.
Submission type: ${config.submissionType}.${avoid}`,
    schema: buildGenerationSchema(config),
  });

  if (!result?.title || !result.description || !result.instructions) {
    return { challenge: pickFallback(config, difficulty), aiGenerated: false };
  }

  const challenge: GeneratedChallenge = {
    title: result.title,
    description: result.description,
    instructions: result.instructions,
  };
  if (result.article || result.quiz) {
    challenge.payload = {};
    if (result.article) challenge.payload.article = result.article;
    if (result.quiz) {
      challenge.payload.quiz = result.quiz.filter(
        (q) =>
          q.options &&
          q.options.length >= 2 &&
          q.answer >= 0 &&
          q.answer < q.options.length,
      );
    }
  }

  if (config.needsQuiz && (challenge.payload?.quiz?.length ?? 0) < 3) {
    return { challenge: pickFallback(config, difficulty), aiGenerated: false };
  }

  return { challenge, aiGenerated: true };
}

const EVALUATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "overallScore",
    "dimensionScores",
    "strengths",
    "improvements",
    "summary",
    "nextChallenge",
  ],
  properties: {
    overallScore: { type: "integer", description: "0-100 overall score" },
    dimensionScores: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["dimension", "score", "comment"],
        properties: {
          dimension: { type: "string" },
          score: { type: "integer", description: "0-100" },
          comment: { type: "string", description: "One-sentence justification" },
        },
      },
    },
    strengths: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
    summary: {
      type: "string",
      description: "2-4 sentence overall assessment addressed to the user",
    },
    nextChallenge: {
      type: "string",
      description: "One concrete suggested follow-up challenge",
    },
  },
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function describeSubmission(
  attempt: Attempt,
  submission: SubmissionInput,
): string {
  const parts: string[] = [];
  if (submission.durationSeconds) {
    parts.push(`Recording duration: ${submission.durationSeconds} seconds.`);
  }
  if (submission.url) parts.push(`Linked repository/URL: ${submission.url}`);
  if (submission.text) {
    const label =
      attempt.submissionType === "video" || attempt.submissionType === "audio"
        ? "Transcript of the recording"
        : attempt.submissionType === "code"
          ? "Submitted code"
          : "Submitted text";
    parts.push(`${label}:\n---\n${submission.text}\n---`);
  }
  return parts.join("\n\n");
}

export async function evaluateSubmission(
  env: CloudflareEnv,
  config: CategoryConfig,
  attempt: Attempt,
  submission: SubmissionInput,
): Promise<Evaluation> {
  if (getApiKey(env)) {
    const result = await structuredCall<{
      overallScore: number;
      dimensionScores: { dimension: string; score: number; comment: string }[];
      strengths: string[];
      improvements: string[];
      summary: string;
      nextChallenge: string;
    }>(env, {
      system:
        "You evaluate challenge submissions for an accountability app. Be a fair but demanding coach: specific, constructive, and honest. Scores are 0-100 where 50 is a genuine borderline attempt, 70 is solid, 85+ is excellent. Do not inflate scores for effort alone. Address the user directly in feedback.",
      prompt: `Evaluate this submission.

CHALLENGE (${config.name}, ${attempt.difficulty} difficulty): ${attempt.title}
${attempt.description}
Instructions given to the user: ${attempt.instructions}

Evaluation guidance: ${config.evaluationGuidance}

Score exactly these dimensions: ${config.dimensions.join(", ")}.

SUBMISSION:
${describeSubmission(attempt, submission) || "(empty submission)"}`,
      schema: EVALUATION_SCHEMA,
    });

    if (result && typeof result.overallScore === "number") {
      return {
        overallScore: clamp(result.overallScore),
        dimensionScores: (result.dimensionScores ?? []).map((d) => ({
          dimension: d.dimension,
          score: clamp(d.score),
          comment: d.comment,
        })),
        strengths: (result.strengths ?? []).slice(0, 5),
        improvements: (result.improvements ?? []).slice(0, 5),
        summary: result.summary,
        nextChallenge: result.nextChallenge || null,
        aiGenerated: true,
      };
    }
  }

  return heuristicEvaluation(config, attempt, submission);
}

function heuristicEvaluation(
  config: CategoryConfig,
  attempt: Attempt,
  submission: SubmissionInput,
): Evaluation {
  const words = (submission.text ?? "").trim().split(/\s+/).filter(Boolean).length;
  const hasContent =
    words > 0 || Boolean(submission.url) || Boolean(submission.durationSeconds);
  const base = !hasContent ? 20 : clamp(55 + Math.min(30, words / 12));
  return {
    overallScore: base,
    dimensionScores: config.dimensions.map((dimension) => ({
      dimension,
      score: base,
      comment: "Provisional score — AI evaluation was unavailable.",
    })),
    strengths: hasContent ? ["You showed up and submitted before the deadline."] : [],
    improvements: hasContent
      ? ["Set OPENROUTER_API_KEY for detailed AI feedback."]
      : ["The submission was empty — complete the task next time."],
    summary: hasContent
      ? "AI evaluation is not configured, so this is a provisional score based on submission completeness. The challenge still counts toward your streak and XP."
      : "The submission was empty. Provisional low score recorded.",
    nextChallenge: null,
    aiGenerated: false,
  };
}

export function scoreQuiz(
  quiz: QuizQuestion[],
  answers: (number | string)[],
): { overallScore: number; correct: number; total: number; perQuestion: boolean[] } {
  const perQuestion = quiz.map((q, i) => {
    const given = answers[i];
    if (given === undefined || given === null || given === "") return false;
    if (typeof q.answer === "number") {
      return Number(given) === q.answer;
    }
    const expected = String(q.answer).trim().toLowerCase();
    const got = String(given).trim().toLowerCase();
    const expectedNum = Number(expected.replace(/,/g, ""));
    const gotNum = Number(got.replace(/,/g, ""));
    if (!Number.isNaN(expectedNum) && !Number.isNaN(gotNum)) {
      return Math.abs(expectedNum - gotNum) < 1e-9;
    }
    return expected === got;
  });
  const correct = perQuestion.filter(Boolean).length;
  return {
    overallScore: quiz.length === 0 ? 0 : Math.round((correct / quiz.length) * 100),
    correct,
    total: quiz.length,
    perQuestion,
  };
}
