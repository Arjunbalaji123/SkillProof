export interface SeedTopic {
  name: string;
  weightPercent: number;
}

export interface SeedSkill {
  name: string;
  slug: string;
  description: string;
  durationSec: number;
  questionCount: number;
  topics: SeedTopic[];
}

export interface SeedTrack {
  name: string;
  description: string;
  skills: SeedSkill[];
}

export const SEED_TRACKS: SeedTrack[] = [
  {
    name: 'UI/Frontend',
    description: 'Modern client-side engineering, responsive component design, state orchestration, and web rendering performance.',
    skills: [
      {
        name: 'JavaScript',
        slug: 'javascript',
        description: 'Core runtime mechanics, prototypes, event loop concurrency, asynchronous patterns, and ES6+ semantics.',
        durationSec: 1800,
        questionCount: 20,
        topics: [
          { name: 'Data Types & Scope', weightPercent: 20 },
          { name: 'Async Programming & Event Loop', weightPercent: 25 },
          { name: 'Prototypes & OOP', weightPercent: 20 },
          { name: 'DOM & Web APIs', weightPercent: 15 },
          { name: 'Modern ES6+ & Performance', weightPercent: 20 },
        ],
      },
      {
        name: 'React',
        slug: 'react',
        description: 'Component lifecycles, hook internals, state machines, reconciliation engine, and React Server Components.',
        durationSec: 1800,
        questionCount: 20,
        topics: [
          { name: 'Component Lifecycle & Rendering', weightPercent: 20 },
          { name: 'Hooks & State Management', weightPercent: 25 },
          { name: 'Performance & Memoization', weightPercent: 20 },
          { name: 'Routing & Data Fetching', weightPercent: 15 },
          { name: 'Server Components & Architecture', weightPercent: 20 },
        ],
      },
      {
        name: 'CSS Architecture',
        slug: 'css-architecture',
        description: 'Layout algorithms, Flexbox, Grid, CSS custom properties, responsive systems, and GPU compositor optimization.',
        durationSec: 1800,
        questionCount: 20,
        topics: [
          { name: 'Box Model & Layout Engines', weightPercent: 25 },
          { name: 'Flexbox & CSS Grid', weightPercent: 25 },
          { name: 'Responsive Design & Media Queries', weightPercent: 20 },
          { name: 'CSS Variables & Modular Architecture', weightPercent: 15 },
          { name: 'Animations & GPU Acceleration', weightPercent: 15 },
        ],
      },
    ],
  },
  {
    name: 'ML Engineer',
    description: 'Production machine learning, statistical computing, distributed feature pipelines, and model deployment.',
    skills: [
      {
        name: 'Python',
        slug: 'python',
        description: 'Scientific computing, vectorized multidimensional arrays, Pandas dataframes, memory management, and GIL tuning.',
        durationSec: 1800,
        questionCount: 20,
        topics: [
          { name: 'Data Structures & Memory Model', weightPercent: 20 },
          { name: 'NumPy & Vectorized Math', weightPercent: 25 },
          { name: 'Pandas & Data Pipelines', weightPercent: 20 },
          { name: 'Model Training & Evaluation Metrics', weightPercent: 20 },
          { name: 'Concurrency & GIL Optimization', weightPercent: 15 },
        ],
      },
      {
        name: 'Data Engineering',
        slug: 'data-engineering',
        description: 'Distributed query execution, batch and real-time streaming, lakehouse architectures, and schema management.',
        durationSec: 1800,
        questionCount: 20,
        topics: [
          { name: 'ETL Pipelines & Workflow Orchestration', weightPercent: 25 },
          { name: 'Data Warehousing & Dimensional Modeling', weightPercent: 20 },
          { name: 'Distributed Processing & PySpark', weightPercent: 25 },
          { name: 'Streaming & Message Queues', weightPercent: 15 },
          { name: 'Data Quality & Schema Evolution', weightPercent: 15 },
        ],
      },
    ],
  },
  {
    name: 'AI Engineer',
    description: 'Generative AI applications, RAG pipelines, fine-tuning adaptation, agent systems, and inference optimization.',
    skills: [
      {
        name: 'LLM Prompting & RAG',
        slug: 'llm-rag',
        description: 'Semantic vector search, chunking strategies, hybrid retrieval, prompt injection defense, and hallucinations mitigation.',
        durationSec: 1800,
        questionCount: 20,
        topics: [
          { name: 'Prompt Engineering & Few-Shot Techniques', weightPercent: 20 },
          { name: 'Embeddings & Vector Databases', weightPercent: 25 },
          { name: 'RAG Chunking & Retrieval Evaluation', weightPercent: 25 },
          { name: 'Context Windows & Tokenization', weightPercent: 15 },
          { name: 'Guardrails & Hallucination Mitigation', weightPercent: 15 },
        ],
      },
      {
        name: 'GenAI Engineering',
        slug: 'genai-engineering',
        description: 'Parameter-efficient fine-tuning (LoRA), tool calling agents, quantization (AWQ/GPTQ), and model evaluation.',
        durationSec: 1800,
        questionCount: 20,
        topics: [
          { name: 'Model Fine-Tuning & LoRA / QLoRA', weightPercent: 25 },
          { name: 'Agent Architectures & Tool Calling', weightPercent: 25 },
          { name: 'Inference Optimization & Quantization', weightPercent: 20 },
          { name: 'Evaluation Frameworks & Benchmarking', weightPercent: 15 },
          { name: 'Multimodal Model Integration', weightPercent: 15 },
        ],
      },
    ],
  },
  {
    name: 'Core',
    description: 'Foundational computer science, JVM systems engineering, concurrency primitives, algorithms, and system design.',
    skills: [
      {
        name: 'Java',
        slug: 'java',
        description: 'JVM memory architecture, garbage collection algorithms, thread synchronization, Spring Boot, and streams API.',
        durationSec: 1800,
        questionCount: 20,
        topics: [
          { name: 'OOP & Java Generics', weightPercent: 20 },
          { name: 'JVM Memory Model & Garbage Collection', weightPercent: 25 },
          { name: 'Concurrency & Multi-Threading', weightPercent: 25 },
          { name: 'Collections & Streams API', weightPercent: 15 },
          { name: 'Spring Boot & Microservices', weightPercent: 15 },
        ],
      },
      {
        name: 'Algorithms & Data Structures',
        slug: 'algorithms',
        description: 'Asymptotic analysis, trees, dynamic programming, graph traversal, and distributed system trade-offs.',
        durationSec: 1800,
        questionCount: 20,
        topics: [
          { name: 'Arrays, Strings & Two-Pointers', weightPercent: 20 },
          { name: 'Trees, Graphs & Traversals', weightPercent: 25 },
          { name: 'Dynamic Programming & Recursion', weightPercent: 25 },
          { name: 'Sorting & Search Complexities', weightPercent: 15 },
          { name: 'System Scaling & Trade-offs', weightPercent: 15 },
        ],
      },
    ],
  },
];

