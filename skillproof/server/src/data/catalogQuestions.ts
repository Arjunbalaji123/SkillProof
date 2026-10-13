import { SEED_TRACKS } from './seedCatalog.js';

export interface CatalogQuestionSeed {
  language: string;
  topic: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  type: 'MCQ' | 'MULTI' | 'CODE_OUTPUT' | 'SCENARIO';
  prompt: string;
  options: string[];
  correctAnswer: string[];
  explanation: string;
}

const QUESTION_TEMPLATES: Array<{
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  type: 'MCQ' | 'SCENARIO' | 'CODE_OUTPUT';
  buildPrompt: (skill: string, topic: string, idx: number) => {
    prompt: string;
    options: string[];
    correctAnswer: string[];
    explanation: string;
  };
}> = [
  // 5 EASY per topic -> 25 EASY per skill
  ...[1, 2, 3, 4, 5].map((variant) => ({
    difficulty: 'EASY' as const,
    type: 'MCQ' as const,
    buildPrompt: (skill: string, topic: string, idx: number) => {
      const optA = `Enforcing deterministic ${topic} invariants and predictable state boundaries in ${skill} (#${idx})`;
      const optB = `Disabling runtime validation checks across all ${topic} modules in ${skill}`;
      const optC = `Replacing ${topic} abstractions with unindexed global mutable variables`;
      const optD = `Ignoring error propagation during synchronous ${topic} initialization`;
      return {
        prompt: `[${skill} • ${topic} • Foundation ${variant}] Which engineering practice best ensures correctness and maintainability when working with ${topic} in ${skill}?`,
        options: [optA, optB, optC, optD],
        correctAnswer: [optA],
        explanation: `In ${skill}, maintaining deterministic invariants and explicit boundaries in ${topic} prevents side-effect leaks and runtime regressions.`,
      };
    },
  })),
  // 5 MEDIUM per topic -> 25 MEDIUM per skill
  ...[1, 2, 3, 4, 5].map((variant) => ({
    difficulty: 'MEDIUM' as const,
    type: 'SCENARIO' as const,
    buildPrompt: (skill: string, topic: string, idx: number) => {
      const optA = `Isolate the ${topic} pipeline, bound resource allocation, and instrument latency metrics in ${skill} (#${idx})`;
      const optB = `Block the main execution thread indefinitely until all ${topic} retries finish`;
      const optC = `Silently swallow exceptions thrown inside the ${topic} handler`;
      const optD = `Duplicate the entire ${skill} memory state on every ${topic} invocation`;
      return {
        prompt: `[${skill} • ${topic} • Production Scenario ${variant}] Under spiky production load, a ${skill} service exhibits latency degradation in its ${topic} layer. What is the most resilient remediation strategy?`,
        options: [optA, optB, optC, optD],
        correctAnswer: [optA],
        explanation: `Bounding resource usage and isolating ${topic} execution paths in ${skill} prevents cascading failures under load.`,
      };
    },
  })),
  // 3 HARD per topic -> 15 HARD per skill
  ...[1, 2, 3].map((variant) => ({
    difficulty: 'HARD' as const,
    type: 'SCENARIO' as const,
    buildPrompt: (skill: string, topic: string, idx: number) => {
      const optA = `Apply idempotent state transitions, strict backpressure, and lock-free ${topic} coordination in ${skill} (#${idx})`;
      const optB = `Use unbounded recursive retries without jitter across all ${topic} workers`;
      const optC = `Disable schema and memory barriers to bypass ${topic} verification`;
      const optD = `Store unencrypted transient ${topic} payloads in shared static singletons`;
      return {
        prompt: `[${skill} • ${topic} • Architecture Deep-Dive ${variant}] When scaling a high-throughput ${skill} system, how should ${topic} be architected to guarantee tail-latency SLAs and zero data corruption?`,
        options: [optA, optB, optC, optD],
        correctAnswer: [optA],
        explanation: `Idempotent transitions, backpressure, and lock-free coordination in ${topic} are essential for high-scale ${skill} systems.`,
      };
    },
  })),
];

export function generateAllCatalogQuestions(): CatalogQuestionSeed[] {
  const results: CatalogQuestionSeed[] = [];
  let counter = 1;
  for (const track of SEED_TRACKS) {
    for (const skill of track.skills) {
      for (const topic of skill.topics) {
        for (const tpl of QUESTION_TEMPLATES) {
          const built = tpl.buildPrompt(skill.name, topic.name, counter++);
          results.push({
            language: skill.name,
            topic: topic.name,
            difficulty: tpl.difficulty,
            type: tpl.type,
            prompt: built.prompt,
            options: built.options,
            correctAnswer: built.correctAnswer,
            explanation: built.explanation,
          });
        }
      }
    }
  }
  return results;
}

