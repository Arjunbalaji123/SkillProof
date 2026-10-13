import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { OpeningService } from '../services/openingService.js';
import { NotificationService } from '../services/notificationService.js';
import { MessageService } from '../services/messageService.js';
import { RecruiterService } from '../services/recruiterService.js';
import { AdminService } from '../services/adminService.js';

const prisma = new PrismaClient();

export const SHARED_SEED_PASSWORD = 'Password123!';

interface RecruiterSeedSpec {
  username: string;
  email: string;
  name: string;
  companyName: string;
  jobTitle: string;
  companyWebsite: string;
  linkedinUrl: string;
  bio: string;
  isVerified: boolean;
}

const RECRUITERS_SPEC: RecruiterSeedSpec[] = [
  // 10 Verified Recruiters
  {
    username: 'recruiter01',
    email: 'recruiter01@seed.skillproof.test',
    name: 'Victoria North',
    companyName: 'Northwind Labs',
    jobTitle: 'Talent Partner',
    companyWebsite: 'https://northwindlabs.seed.skillproof.test',
    linkedinUrl: 'https://linkedin.com/company/northwind-labs-seed',
    bio: 'Northwind Labs designs high-throughput distributed infrastructure and cloud-native microservices.',
    isVerified: true,
  },
  {
    username: 'recruiter02',
    email: 'recruiter02@seed.skillproof.test',
    name: 'Julian Bright',
    companyName: 'Brightpath AI',
    jobTitle: 'Engineering Manager',
    companyWebsite: 'https://brightpathai.seed.skillproof.test',
    linkedinUrl: 'https://linkedin.com/company/brightpath-ai-seed',
    bio: 'Brightpath AI builds autonomous agents, RAG pipelines, and predictive time-series models for enterprise intelligence.',
    isVerified: true,
  },
  {
    username: 'recruiter03',
    email: 'recruiter03@seed.skillproof.test',
    name: 'Siddharth Pixel',
    companyName: 'Pixelforge Studio',
    jobTitle: 'Lead Technical Recruiter',
    companyWebsite: 'https://pixelforgestudio.seed.skillproof.test',
    linkedinUrl: 'https://linkedin.com/company/pixelforge-studio-seed',
    bio: 'Pixelforge Studio creates interactive design systems, accessible UI components, and next-generation web apps.',
    isVerified: true,
  },
  {
    username: 'recruiter04',
    email: 'recruiter04@seed.skillproof.test',
    name: 'Corinne Cobalt',
    companyName: 'Cobalt Analytics',
    jobTitle: 'VP of Engineering',
    companyWebsite: 'https://cobaltanalytics.seed.skillproof.test',
    linkedinUrl: 'https://linkedin.com/company/cobalt-analytics-seed',
    bio: 'Cobalt Analytics provides low-latency financial analytics and massive streaming data ingestion platforms.',
    isVerified: true,
  },
  {
    username: 'recruiter05',
    email: 'recruiter05@seed.skillproof.test',
    name: 'Lucas Lumen',
    companyName: 'Lumen Cloud',
    jobTitle: 'Talent Acquisition Partner',
    companyWebsite: 'https://lumencloud.seed.skillproof.test',
    linkedinUrl: 'https://linkedin.com/company/lumen-cloud-seed',
    bio: 'Lumen Cloud develops cloud infrastructure automation tools, observability consoles, and scalable compute runtimes.',
    isVerified: true,
  },
  {
    username: 'recruiter06',
    email: 'recruiter06@seed.skillproof.test',
    name: 'Helena Helix',
    companyName: 'Helix Robotics',
    jobTitle: 'Head of AI & Robotics Talent',
    companyWebsite: 'https://helixrobotics.seed.skillproof.test',
    linkedinUrl: 'https://linkedin.com/company/helix-robotics-seed',
    bio: 'Helix Robotics engineers real-time teleoperation consoles, autonomous motion planners, and embedded perception stacks.',
    isVerified: true,
  },
  {
    username: 'recruiter07',
    email: 'recruiter07@seed.skillproof.test',
    name: 'Oliver Orbit',
    companyName: 'Orbit Commerce',
    jobTitle: 'Principal Sourcing Lead',
    companyWebsite: 'https://orbitcommerce.seed.skillproof.test',
    linkedinUrl: 'https://linkedin.com/company/orbit-commerce-seed',
    bio: 'Orbit Commerce powers multi-currency checkout funnels, transaction processing engines, and e-commerce catalogs.',
    isVerified: true,
  },
  {
    username: 'recruiter08',
    email: 'recruiter08@seed.skillproof.test',
    name: 'Valerie Vantage',
    companyName: 'Vantage Data',
    jobTitle: 'Director of Technical Recruiting',
    companyWebsite: 'https://vantagedata.seed.skillproof.test',
    linkedinUrl: 'https://linkedin.com/company/vantage-data-seed',
    bio: 'Vantage Data specializes in enterprise data platform ETL, GenAI SQL copilots, and business intelligence pipelines.',
    isVerified: true,
  },
  {
    username: 'recruiter09',
    email: 'recruiter09@seed.skillproof.test',
    name: 'Kai Kitebyte',
    companyName: 'Kitebyte Games',
    jobTitle: 'Engineering Staffing Manager',
    companyWebsite: 'https://kitebytegames.seed.skillproof.test',
    linkedinUrl: 'https://linkedin.com/company/kitebyte-games-seed',
    bio: 'Kitebyte Games produces competitive multiplayer web titles, matchmaking protocols, and player community hubs.',
    isVerified: true,
  },
  {
    username: 'recruiter10',
    email: 'recruiter10@seed.skillproof.test',
    name: 'Giselle Greenleaf',
    companyName: 'Greenleaf Health Tech',
    jobTitle: 'People & Talent Lead',
    companyWebsite: 'https://greenleafhealth.seed.skillproof.test',
    linkedinUrl: 'https://linkedin.com/company/greenleaf-health-tech-seed',
    bio: 'Greenleaf Health Tech develops HIPAA-compliant healthcare data systems and clinical GenAI workflow assistants.',
    isVerified: true,
  },

  // 2 Unverified Recruiters (Pending approval)
  {
    username: 'recruiter11',
    email: 'recruiter11@seed.skillproof.test',
    name: 'Aaron Apex',
    companyName: 'Apex Quantum Systems',
    jobTitle: 'Talent Specialist',
    companyWebsite: 'https://apexquantumsystems.seed.skillproof.test',
    linkedinUrl: 'https://linkedin.com/company/apex-quantum-systems-seed',
    bio: 'Apex Quantum Systems researches quantum simulation algorithms and experimental cloud compute kernels.',
    isVerified: false,
  },
  {
    username: 'recruiter12',
    email: 'recruiter12@seed.skillproof.test',
    name: 'Nadia Nova',
    companyName: 'Nova Synth Labs',
    jobTitle: 'Recruiting Coordinator',
    companyWebsite: 'https://novasynthlabs.seed.skillproof.test',
    linkedinUrl: 'https://linkedin.com/company/nova-synth-labs-seed',
    bio: 'Nova Synth Labs develops synthetic multimodal dataset generation pipelines for vision and language models.',
    isVerified: false,
  },
];

interface DevSeedSpec {
  username: string;
  email: string;
  name: string;
  bio: string;
  skills: {
    name: string;
    score: number;
    level: string;
  }[];
}

const TEST_DEVELOPERS_SPEC: DevSeedSpec[] = [
  {
    username: 'seed_dev_alpha',
    email: 'dev_alpha@seed.skillproof.test',
    name: 'Alex Rivera',
    bio: 'Full-stack UI/Frontend engineer with 6+ years building design systems, React web applications, and accessible component architectures.',
    skills: [
      { name: 'JavaScript', score: 92, level: 'Expert' },
      { name: 'React', score: 88, level: 'Advanced' },
      { name: 'CSS Architecture', score: 82, level: 'Intermediate' },
    ],
  },
  {
    username: 'seed_dev_beta',
    email: 'dev_beta@seed.skillproof.test',
    name: 'Devon Chen',
    bio: 'Machine learning and GenAI systems engineer building production LLM pipelines, RAG retrieval architectures, and data engineering workflows.',
    skills: [
      { name: 'Python', score: 90, level: 'Advanced' },
      { name: 'LLM Prompting & RAG', score: 86, level: 'Advanced' },
      { name: 'GenAI Engineering', score: 80, level: 'Intermediate' },
      { name: 'Data Engineering', score: 75, level: 'Intermediate' },
    ],
  },
  {
    username: 'seed_dev_gamma',
    email: 'dev_gamma@seed.skillproof.test',
    name: 'Samira Patel',
    bio: 'Core backend engineer with deep expertise in distributed concurrency, JVM internals, memory profiling, and high-performance algorithms.',
    skills: [
      { name: 'Java', score: 88, level: 'Advanced' },
      { name: 'Algorithms & Data Structures', score: 85, level: 'Intermediate' },
    ],
  },
];

interface OpeningSeedSpec {
  recruiterUsername: string;
  title: string;
  trackName: string;
  skillNames: string[];
  minScore: number | null;
  minLevel: string | null;
  positions: number;
  description: string;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'EXPIRED';
  expireDaysOffset: number;
}

const OPENINGS_SPEC: OpeningSeedSpec[] = [
  // Recruiter 1: Northwind Labs (3 ACTIVE, 1 PAUSED)
  {
    recruiterUsername: 'recruiter01',
    title: 'Senior React & Design Systems Architect (Remote)',
    trackName: 'UI/Frontend',
    skillNames: ['React', 'CSS Architecture', 'JavaScript'],
    minScore: 75,
    minLevel: 'Intermediate',
    positions: 2,
    description:
      'We are looking for an exceptional Senior React and Design Systems Architect to join our core product engineering team at Northwind Labs. In this role, you will lead the implementation of reusable UI components, maintain design tokens across web applications, and optimize rendering performance for data-intensive dashboards. You will collaborate closely with product designers and backend engineers to build seamless user experiences. Ideal candidates possess deep knowledge of modern JavaScript, component modularity, accessibility standards, and responsive web patterns.',
    status: 'ACTIVE',
    expireDaysOffset: 35,
  },
  {
    recruiterUsername: 'recruiter01',
    title: 'Distributed Java Services Engineer (Hybrid - New York)',
    trackName: 'Core',
    skillNames: ['Java', 'Algorithms & Data Structures'],
    minScore: 70,
    minLevel: 'Intermediate',
    positions: 3,
    description:
      'Northwind Labs is seeking a talented Distributed Java Services Engineer to scale our mission-critical enterprise backends. You will architect high-throughput microservices, implement low-latency messaging patterns, and optimize concurrent data processing pipelines. Working with our infrastructure teams, you will ensure fault-tolerant deployments and maintain rigorous code quality. The ideal engineer has hands-on proficiency in Core Java, data structures, multithreading, and distributed consensus mechanisms. You should enjoy solving hard architectural problems and writing reliable, production-tested software.',
    status: 'ACTIVE',
    expireDaysOffset: 40,
  },
  {
    recruiterUsername: 'recruiter01',
    title: 'Full-Stack Frontend Lead (Remote)',
    trackName: 'UI/Frontend',
    skillNames: ['JavaScript', 'React'],
    minScore: 65,
    minLevel: 'Intermediate',
    positions: 1,
    description:
      'Join Northwind Labs as our Full-Stack Frontend Lead building next-generation customer analytics tooling. You will be responsible for steering the technical direction of client-side web applications, integrating asynchronous RESTful APIs, and mentoring junior engineers. We value engineers who take pride in writing clean, testable JavaScript and React code with a strong emphasis on developer experience and frontend maintainability. Candidates should demonstrate proven expertise in modern state management, component architecture, build systems, and cross-browser performance profiling.',
    status: 'ACTIVE',
    expireDaysOffset: 30,
  },
  {
    recruiterUsername: 'recruiter01',
    title: 'Core Platform Optimization Specialist (On-site - Austin)',
    trackName: 'Core',
    skillNames: ['Algorithms & Data Structures'],
    minScore: 60,
    minLevel: 'Basic',
    positions: 2,
    description:
      'We are hiring a Core Platform Optimization Specialist at Northwind Labs to optimize system throughput and algorithmic efficiency across our compute clusters. In this role, you will analyze execution bottlenecks, refine algorithmic complexity, and implement custom data structures to minimize memory overhead. The position requires strong foundational knowledge of algorithms, memory profiling, and complexity analysis. You will work directly with principal architects to ensure our platform scales efficiently under demanding production workloads.',
    status: 'PAUSED',
    expireDaysOffset: 25,
  },

  // Recruiter 2: Brightpath AI (3 ACTIVE, 1 CLOSED)
  {
    recruiterUsername: 'recruiter02',
    title: 'Applied ML Engineer - Predictive Forecasting (Remote)',
    trackName: 'ML Engineer',
    skillNames: ['Python', 'Data Engineering'],
    minScore: 75,
    minLevel: 'Intermediate',
    positions: 2,
    description:
      'Brightpath AI is looking for an Applied Machine Learning Engineer specializing in predictive forecasting and multivariate time-series models. You will design, train, and deploy production ML models that process streaming telemetry data. Responsibilities include engineering robust feature pipelines, tuning hyperparameters, and collaborating with data engineers to automate model retraining workflows. Strong practical experience in Python, statistical modeling, and data manipulation libraries is essential. You will directly contribute to core predictive engines relied upon by enterprise customers worldwide.',
    status: 'ACTIVE',
    expireDaysOffset: 30,
  },
  {
    recruiterUsername: 'recruiter02',
    title: 'LLM Evaluation & RAG Engineer (Hybrid - San Francisco)',
    trackName: 'AI Engineer',
    skillNames: ['LLM Prompting & RAG', 'GenAI Engineering'],
    minScore: 70,
    minLevel: 'Intermediate',
    positions: 1,
    description:
      'Join Brightpath AI to build state-of-the-art retrieval-augmented generation pipelines and automated LLM benchmarking suites. As an LLM Evaluation and RAG Engineer, you will implement semantic chunking strategies, configure vector database retrieval, and design comprehensive evaluation metrics to minimize model hallucination. We seek engineers skilled in prompt engineering, context window management, and GenAI frameworks. Your work will directly define how our autonomous AI agents synthesize knowledge and deliver accurate domain-specific reasoning to end users.',
    status: 'ACTIVE',
    expireDaysOffset: 42,
  },
  {
    recruiterUsername: 'recruiter02',
    title: 'AI Application Prototyper (Remote)',
    trackName: 'AI Engineer',
    skillNames: ['GenAI Engineering', 'Python'],
    minScore: 65,
    minLevel: 'Basic',
    positions: 2,
    description:
      'Brightpath AI is seeking an AI Application Prototyper to rapidly iterate on cutting-edge generative AI experiences. In this creative role, you will build full-stack proof-of-concept applications integrating large language models with modern APIs. You will test emerging model capabilities, evaluate prompt strategies, and translate complex technical requirements into delightful user interactions. Proficiency in Python, modern API design, and rapid prototyping methodologies is required. If you love experimenting with bleeding-edge AI primitives, this role is for you.',
    status: 'ACTIVE',
    expireDaysOffset: 28,
  },
  {
    recruiterUsername: 'recruiter02',
    title: 'Senior Data Pipeline Specialist (Remote)',
    trackName: 'ML Engineer',
    skillNames: ['Data Engineering'],
    minScore: 60,
    minLevel: 'Basic',
    positions: 1,
    description:
      'We are seeking a Senior Data Pipeline Specialist at Brightpath AI to maintain high-throughput ETL data pipelines feeding our predictive intelligence platforms. You will develop resilient data ingestion jobs, optimize database querying performance, and implement automated validation checks to safeguard data integrity. The ideal candidate possesses deep experience with Python data tooling, distributed storage systems, and workflow orchestration. You will collaborate closely with machine learning researchers to provide clean, reliable datasets for model training.',
    status: 'CLOSED',
    expireDaysOffset: 20,
  },

  // Recruiter 3: Pixelforge Studio (2 ACTIVE, 1 PAUSED)
  {
    recruiterUsername: 'recruiter03',
    title: 'Frontend UI Interactive Specialist (Hybrid - Seattle)',
    trackName: 'UI/Frontend',
    skillNames: ['JavaScript', 'CSS Architecture'],
    minScore: 60,
    minLevel: 'Basic',
    positions: 3,
    description:
      'Pixelforge Studio is looking for a creative Frontend UI Interactive Specialist to craft engaging web interfaces and interactive digital products. You will turn intricate Figma designs into responsive, accessible web layouts using modern CSS architecture and Vanilla JavaScript. Attention to detail regarding animations, typography, and micro-interactions is vital. You should possess strong fundamentals in DOM manipulation, CSS grid systems, responsive breakpoints, and web standards. Come build delightful visual experiences with our collaborative design and engineering teams.',
    status: 'ACTIVE',
    expireDaysOffset: 30,
  },
  {
    recruiterUsername: 'recruiter03',
    title: 'Junior React Web Developer (Remote)',
    trackName: 'UI/Frontend',
    skillNames: ['React', 'JavaScript'],
    minScore: 50,
    minLevel: 'Basic',
    positions: 4,
    description:
      'Pixelforge Studio is expanding its web engineering team and seeking a Junior React Web Developer eager to grow in a fast-paced creative environment. You will contribute to customer-facing web applications, implement modular UI components, and fix frontend defects under the mentorship of senior staff. A solid understanding of modern JavaScript, React component lifecycle, props, state, and CSS styling is required. This is an outstanding opportunity for an enthusiastic developer to build foundational professional experience.',
    status: 'ACTIVE',
    expireDaysOffset: 45,
  },
  {
    recruiterUsername: 'recruiter03',
    title: 'NextGen Web Component Architect (Remote)',
    trackName: 'UI/Frontend',
    skillNames: ['JavaScript', 'React', 'CSS Architecture'],
    minScore: 85,
    minLevel: 'Advanced',
    positions: 1,
    description:
      'We are seeking an experienced NextGen Web Component Architect at Pixelforge Studio to lead our cross-platform design library initiative. You will establish coding standards, build high-performance headless component primitives, and ensure pixel-perfect accessibility across browser environments. Strong mastery of advanced JavaScript patterns, custom hooks, atomic design principles, and CSS architecture is required. You will influence frontend technical strategy across multiple studio projects, balancing creative flexibility with strict performance and security standards.',
    status: 'PAUSED',
    expireDaysOffset: 15,
  },

  // Recruiter 4: Cobalt Analytics (2 ACTIVE, 1 EXPIRED)
  {
    recruiterUsername: 'recruiter04',
    title: 'Enterprise Java Backend Architect (Hybrid - Chicago)',
    trackName: 'Core',
    skillNames: ['Java', 'Algorithms & Data Structures'],
    minScore: 80,
    minLevel: 'Advanced',
    positions: 2,
    description:
      'Cobalt Analytics is hiring an Enterprise Java Backend Architect to lead the modernization of our core financial analytics engine. In this key role, you will architect resilient backend services, implement transactional database interactions, and optimize algorithmic execution for large datasets. You must demonstrate deep expertise in Core Java, object-oriented design, multithreaded concurrency, and algorithmic optimization. You will set architectural standards and mentor an experienced team of engineers building high-value enterprise analytical products.',
    status: 'ACTIVE',
    expireDaysOffset: 35,
  },
  {
    recruiterUsername: 'recruiter04',
    title: 'High-Throughput Analytics Engineer (Remote)',
    trackName: 'ML Engineer',
    skillNames: ['Python', 'Data Engineering'],
    minScore: 65,
    minLevel: 'Intermediate',
    positions: 3,
    description:
      'Join Cobalt Analytics as a High-Throughput Analytics Engineer developing scalable data ingestion and real-time processing engines. You will write efficient Python pipelines, optimize data transformation jobs, and interface with distributed databases to serve real-time analytics dashboards. Candidates must be proficient in Python, data processing libraries, and structured query optimization. We value engineers who can balance rapid delivery with sound engineering hygiene, automated testing, and comprehensive technical documentation.',
    status: 'ACTIVE',
    expireDaysOffset: 30,
  },
  {
    recruiterUsername: 'recruiter04',
    title: 'Legacy Java Migration Specialist (On-site - Boston)',
    trackName: 'Core',
    skillNames: ['Java'],
    minScore: 55,
    minLevel: 'Basic',
    positions: 1,
    description:
      'Cobalt Analytics is seeking a dedicated Legacy Java Migration Specialist to assist in upgrading critical backend infrastructure. You will refactor monolithic Java applications into modular services, modernize dependency management, and improve automated unit test coverage. Experience with Core Java, debugging complex codebases, and resolving concurrency anomalies is required. You will work closely with system administrators and QA engineers to ensure uninterrupted system availability throughout the refactoring lifecycle.',
    status: 'EXPIRED',
    expireDaysOffset: -5,
  },

  // Recruiter 5: Lumen Cloud (2 ACTIVE, 1 CLOSED)
  {
    recruiterUsername: 'recruiter05',
    title: 'Python Cloud Automation Engineer (Remote)',
    trackName: 'ML Engineer',
    skillNames: ['Python'],
    minScore: 60,
    minLevel: 'Basic',
    positions: 2,
    description:
      'Lumen Cloud is searching for a Python Cloud Automation Engineer to automate cloud infrastructure provisioning and operational workflows. In this position, you will author modular Python scripts, develop custom CLI utilities, and integrate public cloud APIs to streamline system administration. The ideal candidate has practical experience with Python development, REST API consumption, and automated system maintenance. You will help our infrastructure engineering team achieve high reliability and continuous operational efficiency.',
    status: 'ACTIVE',
    expireDaysOffset: 25,
  },
  {
    recruiterUsername: 'recruiter05',
    title: 'Cloud Infrastructure Algorithms Engineer (Hybrid - Denver)',
    trackName: 'Core',
    skillNames: ['Algorithms & Data Structures', 'Java'],
    minScore: 75,
    minLevel: 'Intermediate',
    positions: 2,
    description:
      'We are looking for a Cloud Infrastructure Algorithms Engineer at Lumen Cloud to optimize resource allocation, workload scheduling, and network routing policies. You will translate complex operational constraints into efficient algorithmic solutions implemented in Core Java. Strong problem-solving abilities and demonstrated mastery of graph algorithms, greedy heuristics, and dynamic programming are essential. You will collaborate with our cloud runtime team to maximize server utilization and reduce latency across global data centers.',
    status: 'ACTIVE',
    expireDaysOffset: 40,
  },
  {
    recruiterUsername: 'recruiter05',
    title: 'Cloud Observability UI Engineer (Remote)',
    trackName: 'UI/Frontend',
    skillNames: ['React', 'CSS Architecture'],
    minScore: 55,
    minLevel: 'Basic',
    positions: 1,
    description:
      'Lumen Cloud is hiring a Cloud Observability UI Engineer to build interactive monitoring consoles and telemetry visualization tools. You will create responsive React interfaces that visualize millions of real-time server metrics, alerts, and system health graphs. Strong fundamentals in React, modern CSS architecture, and asynchronous data streaming are required. You will partner with site reliability engineers to deliver an intuitive, lightning-fast observability interface that our operations team relies on daily.',
    status: 'CLOSED',
    expireDaysOffset: 10,
  },

  // Recruiter 6: Helix Robotics (2 ACTIVE, 1 PAUSED)
  {
    recruiterUsername: 'recruiter06',
    title: 'Robotics Telemetry Dashboard Lead (Hybrid - Pittsburgh)',
    trackName: 'UI/Frontend',
    skillNames: ['React', 'JavaScript'],
    minScore: 70,
    minLevel: 'Intermediate',
    positions: 2,
    description:
      'Helix Robotics is seeking a Robotics Telemetry Dashboard Lead to head the development of mission-critical control stations and telemetry visualization dashboards. You will build high-frequency frontend interfaces in React and JavaScript that render real-time robot sensor data, camera feeds, and coordinate telemetry. Ideal candidates possess solid experience in frontend optimization, state synchronization, and component architecture. You will collaborate with robotics firmware developers and field test engineers to deploy reliable teleoperation tooling.',
    status: 'ACTIVE',
    expireDaysOffset: 38,
  },
  {
    recruiterUsername: 'recruiter06',
    title: 'Perception & Deep Learning Engineer (On-site - Pittsburgh)',
    trackName: 'ML Engineer',
    skillNames: ['Python', 'Data Engineering'],
    minScore: 85,
    minLevel: 'Advanced',
    positions: 1,
    description:
      'Join Helix Robotics as a Perception and Deep Learning Engineer building autonomous spatial reasoning models for industrial robotic arms. You will train computer vision and point cloud models using Python, build data preprocessing pipelines, and deploy models onto edge computing hardware. We seek candidates with deep expertise in Python, tensor computation, data engineering, and model optimization. You will work on solving challenging real-world robotics perception and obstacle avoidance problems.',
    status: 'ACTIVE',
    expireDaysOffset: 30,
  },
  {
    recruiterUsername: 'recruiter06',
    title: 'Embedded Motion Planning Engineer (On-site - Pittsburgh)',
    trackName: 'Core',
    skillNames: ['Algorithms & Data Structures'],
    minScore: 85,
    minLevel: 'Advanced',
    positions: 1,
    description:
      'Helix Robotics is looking for an Embedded Motion Planning Engineer to develop real-time trajectory generation algorithms for autonomous mobile robots. You will implement spatial search algorithms, collision avoidance math, and inverse kinematics solvers in high-efficiency Java and core data structures. Candidates must possess outstanding algorithmic intuition, thorough understanding of search trees, and experience debugging timing-critical execution. Your algorithms will directly dictate robot movement safety in dynamic factory environments.',
    status: 'PAUSED',
    expireDaysOffset: 22,
  },

  // Recruiter 7: Orbit Commerce (2 ACTIVE, 1 EXPIRED)
  {
    recruiterUsername: 'recruiter07',
    title: 'Checkout Experience React Engineer (Remote)',
    trackName: 'UI/Frontend',
    skillNames: ['React', 'JavaScript'],
    minScore: 65,
    minLevel: 'Basic',
    positions: 3,
    description:
      'Orbit Commerce is seeking a Checkout Experience React Engineer to optimize our global multi-currency checkout funnel. You will develop highly accessible, responsive web interfaces, implement client-side payment validation, and optimize checkout conversion rates. Deep knowledge of React, JavaScript, state management, and modern CSS layout techniques is necessary. You will partner with product managers and UX researchers to create frictionless shopping experiences for tens of millions of monthly online consumers.',
    status: 'ACTIVE',
    expireDaysOffset: 33,
  },
  {
    recruiterUsername: 'recruiter07',
    title: 'Core Transaction Processing Developer (Hybrid - Atlanta)',
    trackName: 'Core',
    skillNames: ['Java', 'Algorithms & Data Structures'],
    minScore: 70,
    minLevel: 'Intermediate',
    positions: 2,
    description:
      'Join Orbit Commerce as a Core Transaction Processing Developer architecting ultra-reliable payment and inventory reconciliation backends. You will write concurrent Java services, implement idempotent transaction handlers, and optimize database access algorithms under peak holiday traffic spikes. Requirements include thorough proficiency in Core Java, algorithmic efficiency, thread concurrency, and data persistence models. You will play a central role in guaranteeing zero downtime and strict data consistency across our commerce engine.',
    status: 'ACTIVE',
    expireDaysOffset: 44,
  },
  {
    recruiterUsername: 'recruiter07',
    title: 'Catalog Search ML Specialist (Remote)',
    trackName: 'ML Engineer',
    skillNames: ['Python'],
    minScore: 55,
    minLevel: 'Basic',
    positions: 1,
    description:
      'Orbit Commerce is hiring a Catalog Search ML Specialist to improve product ranking and semantic relevance across millions of catalog items. You will build machine learning recommendation models and ranking algorithms using Python and modern data processing tools. Candidates must have a solid foundation in Python, feature extraction, and information retrieval concepts. You will collaborate with catalog engineering to boost search relevance and enhance shopper discovery.',
    status: 'EXPIRED',
    expireDaysOffset: -10,
  },

  // Recruiter 8: Vantage Data (2 ACTIVE)
  {
    recruiterUsername: 'recruiter08',
    title: 'GenAI Analytics Copilot Engineer (Remote)',
    trackName: 'AI Engineer',
    skillNames: ['GenAI Engineering', 'LLM Prompting & RAG', 'Python'],
    minScore: 75,
    minLevel: 'Intermediate',
    positions: 2,
    description:
      'Vantage Data is looking for a GenAI Analytics Copilot Engineer to build conversational natural language interfaces for enterprise business intelligence datasets. You will architect RAG workflows, design structured prompt templates, and implement automated schema-to-SQL generation pipelines. Proficiency in GenAI engineering, LLM prompting, and Python is required. You will work alongside data warehouse architects to enable business analysts to query petabyte-scale data using intuitive natural language dialogue.',
    status: 'ACTIVE',
    expireDaysOffset: 35,
  },
  {
    recruiterUsername: 'recruiter08',
    title: 'Data Platform ETL Developer (Hybrid - Dallas)',
    trackName: 'ML Engineer',
    skillNames: ['Data Engineering', 'Python'],
    minScore: 65,
    minLevel: 'Intermediate',
    positions: 2,
    description:
      'Vantage Data is seeking a Data Platform ETL Developer to construct scalable data ingestion pipelines for large-scale enterprise analytics. You will write robust Python data transformations, schedule batch processing workflows, and enforce strict data quality standards across diverse data lakes. Essential skills include Python proficiency, data engineering methodologies, and database performance tuning. You will help our data platform team deliver accurate, timely data products to enterprise business decision-makers.',
    status: 'ACTIVE',
    expireDaysOffset: 29,
  },

  // Recruiter 9: Kitebyte Games (2 ACTIVE)
  {
    recruiterUsername: 'recruiter09',
    title: 'Game Web Portal UI Engineer (Remote)',
    trackName: 'UI/Frontend',
    skillNames: ['JavaScript', 'CSS Architecture', 'React'],
    minScore: 60,
    minLevel: 'Basic',
    positions: 2,
    description:
      'Kitebyte Games is hiring a Game Web Portal UI Engineer to build vibrant community hubs, leaderboard dashboards, and account management portals for our multiplayer gaming titles. You will build responsive React web applications with engaging CSS visual effects and seamless JavaScript integrations. Familiarity with component styling, web animation libraries, and API consumption is required. Join our studio to deliver memorable, high-performance web experiences to passionate gaming communities.',
    status: 'ACTIVE',
    expireDaysOffset: 36,
  },
  {
    recruiterUsername: 'recruiter09',
    title: 'Multiplayer Networking Core Engineer (Hybrid - Los Angeles)',
    trackName: 'Core',
    skillNames: ['Java', 'Algorithms & Data Structures'],
    minScore: 85,
    minLevel: 'Advanced',
    positions: 1,
    description:
      'Kitebyte Games seeks an experienced Multiplayer Networking Core Engineer to develop authoritative game server synchronization protocols and match matchmaking infrastructure. You will implement low-latency packet processing, state interpolation algorithms, and concurrent room management services using Core Java. Required skills include expert mastery of algorithms, data structures, and multithreaded network programming. You will ensure millions of players enjoy smooth, cheat-resistant multiplayer gameplay across competitive online gaming sessions.',
    status: 'ACTIVE',
    expireDaysOffset: 41,
  },

  // Recruiter 10: Greenleaf Health Tech (2 ACTIVE)
  {
    recruiterUsername: 'recruiter10',
    title: 'Clinical LLM Workflow Specialist (Remote)',
    trackName: 'AI Engineer',
    skillNames: ['LLM Prompting & RAG', 'GenAI Engineering'],
    minScore: 70,
    minLevel: 'Intermediate',
    positions: 2,
    description:
      'Greenleaf Health Tech is seeking a Clinical LLM Workflow Specialist to deploy generative AI solutions that assist healthcare practitioners with documentation and medical literature summarization. You will develop hallucination-resistant prompt chains, implement secure retrieval architectures, and evaluate model accuracy against clinical benchmarks. Candidates must demonstrate proficiency in GenAI engineering, prompt engineering, and Python. You will collaborate with clinical advisors to create responsible, secure, and HIPAA-compliant AI tools.',
    status: 'ACTIVE',
    expireDaysOffset: 30,
  },
  {
    recruiterUsername: 'recruiter10',
    title: 'Healthcare Privacy & Core Systems Developer (Hybrid - Raleigh)',
    trackName: 'Core',
    skillNames: ['Java'],
    minScore: 60,
    minLevel: 'Basic',
    positions: 2,
    description:
      'Greenleaf Health Tech is looking for a Healthcare Privacy and Core Systems Developer to engineer secure data management backends for electronic medical records. You will implement strict data encryption protocols, audit logging services, and role-based access control algorithms in Core Java. Thorough knowledge of Java, secure coding principles, and fundamental data structures is required. You will contribute to life-critical software systems that protect patient confidentiality and ensure regulatory compliance.',
    status: 'ACTIVE',
    expireDaysOffset: 27,
  },
];

async function main() {
  console.log('🚀 Starting idempotent Recruiter Ecosystem Seeding...\n');

  // Disable auto-responder during initial batch seed so we can control exact states
  process.env.SEED_RECRUITER_AUTOREPLY = 'false';

  // 0. Audit non-seed real accounts before
  const realAccountsBefore = await prisma.user.count({ where: { isSeed: false } });
  console.log(`🛡️  Verified ${realAccountsBefore} non-seed user accounts currently in database.`);
  console.log('   All non-seed user accounts will remain 100% untouched throughout seeding.\n');

  // Idempotent cleanup of existing seed rows
  const existingSeedUsers = await prisma.user.findMany({
    where: { isSeed: true },
    select: { id: true },
  });
  const existingSeedUserIds = existingSeedUsers.map((u) => u.id);

  if (existingSeedUserIds.length > 0) {
    console.log(`🧹 Found ${existingSeedUserIds.length} existing seed user(s). Cleaning up previous seed run...`);

    const existingSeedOpenings = await prisma.opening.findMany({
      where: { recruiterId: { in: existingSeedUserIds } },
      select: { id: true },
    });
    const existingSeedOpeningIds = existingSeedOpenings.map((o) => o.id);

    // Delete notifications associated with seed users or seed openings
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { userId: { in: existingSeedUserIds } },
          { entityId: { in: existingSeedOpeningIds } },
        ],
      },
    });

    // Delete bookmarks referencing seed users
    await prisma.bookmark.deleteMany({
      where: {
        OR: [
          { recruiterId: { in: existingSeedUserIds } },
          { developerId: { in: existingSeedUserIds } },
        ],
      },
    });

    // Delete conversation participants and messages
    await prisma.conversationParticipant.deleteMany({
      where: { userId: { in: existingSeedUserIds } },
    });
    await prisma.message.deleteMany({
      where: { senderId: { in: existingSeedUserIds } },
    });

    // Delete approaches and conversations
    await prisma.approach.deleteMany({
      where: {
        OR: [
          { developerId: { in: existingSeedUserIds } },
          { openingId: { in: existingSeedOpeningIds } },
        ],
      },
    });
    await prisma.conversation.deleteMany({
      where: {
        OR: [
          { recruiterId: { in: existingSeedUserIds } },
          { developerId: { in: existingSeedUserIds } },
        ],
      },
    });

    // Delete openings and skills
    await prisma.openingSkill.deleteMany({
      where: { openingId: { in: existingSeedOpeningIds } },
    });
    await prisma.opening.deleteMany({
      where: { id: { in: existingSeedOpeningIds } },
    });

    // Delete developer interests, skills, profiles, and users
    await prisma.developerInterest.deleteMany({
      where: { userId: { in: existingSeedUserIds } },
    });
    await prisma.skill.deleteMany({
      where: { userId: { in: existingSeedUserIds } },
    });
    await prisma.developerProfile.deleteMany({
      where: { userId: { in: existingSeedUserIds } },
    });
    await prisma.recruiterProfile.deleteMany({
      where: { userId: { in: existingSeedUserIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: existingSeedUserIds } },
    });

    console.log('   ✅ Previous seed data cleanly removed.\n');
  }

  // 1. Precompute shared password hash (cost 10)
  console.log('🔒 Precomputing shared seed password hash...');
  const sharedPasswordHash = await bcrypt.hash(SHARED_SEED_PASSWORD, 10);

  // 2. Load Tracks and SkillCatalogs
  const tracks = await prisma.track.findMany();
  const trackByName = new Map(tracks.map((t) => [t.name.toLowerCase(), t]));

  const catalogs = await prisma.skillCatalog.findMany();
  const catalogByName = new Map(catalogs.map((c) => [c.name.toLowerCase(), c]));

  // 3. Seed Recruiters (10 Verified + 2 Unverified)
  console.log('👥 Seeding recruiters (10 verified, 2 unverified)...');
  const createdRecruiters = new Map<string, any>();

  for (const spec of RECRUITERS_SPEC) {
    const user = await prisma.user.create({
      data: {
        username: spec.username.toLowerCase(),
        email: spec.email.toLowerCase(),
        name: spec.name,
        passwordHash: sharedPasswordHash,
        role: 'RECRUITER',
        status: 'ACTIVE',
        isDemo: false,
        isSeed: true,
        recruiterProfile: {
          create: {
            companyName: spec.companyName,
            jobTitle: spec.jobTitle,
            companyWebsite: spec.companyWebsite,
            linkedinUrl: spec.linkedinUrl,
            bio: spec.bio,
            isVerified: spec.isVerified,
            verifiedAt: spec.isVerified ? new Date() : null,
            verifiedBy: spec.isVerified ? 'admin' : null,
          },
        },
      },
      include: { recruiterProfile: true },
    });
    createdRecruiters.set(spec.username, user);
  }
  console.log(`   ✅ Seeded ${createdRecruiters.size} recruiters.\n`);

  // 4. Seed Test Developers
  console.log('💻 Seeding 3 verified test developers...');
  const createdDevelopers = new Map<string, any>();

  for (const devSpec of TEST_DEVELOPERS_SPEC) {
    const devUser = await prisma.user.create({
      data: {
        username: devSpec.username.toLowerCase(),
        email: devSpec.email.toLowerCase(),
        name: devSpec.name,
        passwordHash: sharedPasswordHash,
        role: 'DEVELOPER',
        status: 'ACTIVE',
        isDemo: false,
        isSeed: true,
        profile: {
          create: {
            bio: devSpec.bio,
            isPublic: true,
            allowRecruiterMessages: true,
            notificationsPaused: false,
            showOnLeaderboard: true,
          },
        },
      },
      include: { profile: true },
    });

    for (const sk of devSpec.skills) {
      const cat = catalogByName.get(sk.name.toLowerCase());
      await prisma.skill.create({
        data: {
          userId: devUser.id,
          skillCatalogId: cat ? cat.id : null,
          language: sk.name,
          claimedLevel: sk.level,
          bestScore: sk.score,
          status: 'VERIFIED',
          verifiedAt: new Date(),
        },
      });
    }

    createdDevelopers.set(devSpec.username, devUser);
  }
  console.log(`   ✅ Seeded ${createdDevelopers.size} verified developers.\n`);

  // 5. Backfill developer interests from verified skills
  console.log('🔄 Backfilling DeveloperInterest and catalog links...');
  const backfillResult = await OpeningService.backfillInterestsFromVerifiedSkills();
  console.log(`   ✅ Created ${backfillResult.createdInterests} developer interest records.\n`);

  // 6. Seed Openings via OpeningService & Admin Review
  console.log('💼 Seeding 29 openings across UI/Frontend, ML Engineer, AI Engineer, and Core tracks...');

  // Cleanup old OPENING_MATCH notifications belonging to non-ACTIVE openings without notifiedAt
  const nonActiveUnnotified = await prisma.opening.findMany({
    where: {
      status: { not: 'ACTIVE' },
      notifiedAt: null,
    },
    select: { id: true },
  });
  const nonActiveIds = nonActiveUnnotified.map((o) => o.id);
  const deletedOldNotifs = await prisma.notification.deleteMany({
    where: {
      type: 'OPENING_MATCH',
      entityId: { in: nonActiveIds },
    },
  });
  console.log(`   🧹 Removed ${deletedOldNotifs.count} old OPENING_MATCH notification(s) belonging to non-ACTIVE openings without notifiedAt.`);

  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser) {
    throw new Error('Admin user not found for approving openings');
  }

  const createdOpenings: any[] = [];
  let totalMatchesLogged = 0;

  for (let idx = 0; idx < OPENINGS_SPEC.length; idx++) {
    const op = OPENINGS_SPEC[idx];
    const recruiter = createdRecruiters.get(op.recruiterUsername);
    if (!recruiter) {
      throw new Error(`Recruiter not found: ${op.recruiterUsername}`);
    }

    const track = trackByName.get(op.trackName.toLowerCase());
    if (!track) {
      throw new Error(`Track not found: ${op.trackName}`);
    }

    const skillCatalogIds: string[] = [];
    for (const skName of op.skillNames) {
      const cat = catalogByName.get(skName.toLowerCase());
      if (cat) {
        skillCatalogIds.push(cat.id);
      } else {
        throw new Error(`Skill catalog entry not found: ${skName}`);
      }
    }

    const expiresAt = new Date(Date.now() + op.expireDaysOffset * 24 * 60 * 60 * 1000);

    // 1. Create opening via OpeningService (saved as PENDING_REVIEW, does not notify developers)
    const opening = await OpeningService.createOpening(recruiter.id, {
      title: op.title,
      trackId: track.id,
      description: op.description,
      minLevel: op.minLevel,
      minScore: op.minScore,
      positions: op.positions,
      skillCatalogIds,
      expiresAt: op.status === 'EXPIRED' ? new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) : expiresAt,
    });

    // 2. Decide review disposition per specification:
    // - Leave 3 as PENDING_REVIEW (indices 22, 23, 24)
    // - Reject 1 with a reason (index 25)
    // - Approve the remaining ~25 (indices 0..21, 26..28), setting PAUSED/CLOSED/EXPIRED as specified
    if (idx === 22 || idx === 23 || idx === 24) {
      // Leave as PENDING_REVIEW
      createdOpenings.push(opening);
    } else if (idx === 25) {
      // Reject with a reason via AdminService.reviewOpening
      const rejected = await AdminService.reviewOpening(
        adminUser.id,
        opening.id,
        'REJECT',
        'Job description missing required team structure and compensation band.'
      );
      createdOpenings.push(rejected);
    } else {
      // Approve via AdminService.reviewOpening (dispatches matching notifications, sets notifiedAt)
      await AdminService.reviewOpening(adminUser.id, opening.id, 'APPROVE');

      if (op.status === 'PAUSED' || op.status === 'CLOSED') {
        const updated = await OpeningService.updateOpening(recruiter.id, opening.id, {
          status: op.status,
        });
        createdOpenings.push(updated);
      } else if (op.status === 'EXPIRED') {
        const expired = await prisma.opening.update({
          where: { id: opening.id },
          data: {
            status: 'EXPIRED',
            expiresAt,
          },
        });
        createdOpenings.push(expired);
      } else {
        const active = await prisma.opening.findUnique({ where: { id: opening.id } });
        createdOpenings.push(active);
      }
    }

    // Check matches for this opening
    const matches = await OpeningService.findMatchingDevelopers(opening.id);
    totalMatchesLogged += matches.length;
  }

  console.log(`   ✅ Created ${createdOpenings.length} openings via OpeningService.`);
  console.log(`   📊 Generated ${totalMatchesLogged} developer match query results.\n`);

  // 7. Seed Approaches & Conversations via MessageService
  console.log('💬 Seeding approaches, conversations, and direct recruiter messages via MessageService...');
  const devAlpha = createdDevelopers.get('seed_dev_alpha')!;
  const devBeta = createdDevelopers.get('seed_dev_beta')!;
  const devGamma = createdDevelopers.get('seed_dev_gamma')!;

  const rec01 = createdRecruiters.get('recruiter01')!;
  const rec02 = createdRecruiters.get('recruiter02')!;
  const rec03 = createdRecruiters.get('recruiter03')!;
  const rec04 = createdRecruiters.get('recruiter04')!;
  const rec05 = createdRecruiters.get('recruiter05')!;
  const rec06 = createdRecruiters.get('recruiter06')!;
  const rec07 = createdRecruiters.get('recruiter07')!;

  // Approach 1 (PENDING): dev_alpha -> Opening 0 (Senior React & Design Systems Architect at Northwind Labs)
  const app1 = await MessageService.approachOpening(
    devAlpha.id,
    createdOpenings[0].id,
    "Hello Victoria, I have extensive experience building scalable design systems in React and TypeScript. I would love to learn more about Northwind Labs' frontend architecture and roadmap."
  );
  console.log(`   [1/5] PENDING approach created (dev_alpha -> ${createdOpenings[0].title})`);

  // Approach 2 (PENDING): dev_beta -> Opening 4 (Applied ML Engineer - Predictive Forecasting at Brightpath AI)
  const app2 = await MessageService.approachOpening(
    devBeta.id,
    createdOpenings[4].id,
    "Hi Julian, my verified skills in Python and time-series data pipelines align closely with your team's forecasting models. Looking forward to discussing the role!"
  );
  console.log(`   [2/5] PENDING approach created (dev_beta -> ${createdOpenings[4].title})`);

  // Approach 3 (ACCEPTED): dev_alpha -> Opening 8 (Frontend UI Interactive Specialist at Pixelforge Studio)
  const app3 = await MessageService.approachOpening(
    devAlpha.id,
    createdOpenings[8].id,
    'Hi Siddharth, I noticed Pixelforge Studio is looking for interactive UI specialists. My verified CSS architecture and JavaScript portfolio matches this role well.'
  );
  const decision3 = await MessageService.decideApproach(rec03.id, app3.approach.id, 'ACCEPTED');
  // Add conversation history
  await MessageService.sendMessage(
    rec03.id,
    decision3.conversationId!,
    'Hello Alex! Thanks for reaching out. We were impressed by your verified scores and design system portfolio. When are you free for a 20-minute intro chat?'
  );
  await MessageService.sendMessage(
    devAlpha.id,
    decision3.conversationId!,
    'Hi Siddharth! Thanks for the prompt reply. I am available this Thursday at 2 PM EST or Friday morning. Let me know what works best.'
  );
  await MessageService.sendMessage(
    rec03.id,
    decision3.conversationId!,
    'Thursday at 2 PM EST works perfectly. I will send over a calendar invitation shortly. Talk to you then!'
  );
  console.log(`   [3/5] ACCEPTED approach with 4-message chat history (dev_alpha <-> rec03)`);

  // Approach 4 (DECLINED): dev_gamma -> Opening 11 (Enterprise Java Backend Architect at Cobalt Analytics)
  const app4 = await MessageService.approachOpening(
    devGamma.id,
    createdOpenings[11].id,
    'Hello Corinne, I have strong benchmark scores in Core Java and distributed algorithms, and I am interested in Cobalt Analytics backend architecture.'
  );
  await MessageService.decideApproach(rec04.id, app4.approach.id, 'DECLINED');
  console.log(`   [4/5] DECLINED approach created (dev_gamma -> rec04)`);

  // Approach 5 (SAVED): dev_beta -> Opening 14 (Python Cloud Automation Engineer at Lumen Cloud)
  const app5 = await MessageService.approachOpening(
    devBeta.id,
    createdOpenings[14].id,
    'Hi Lucas, I have been building automated Python pipelines and cloud tooling. Would love to explore opportunities at Lumen Cloud.'
  );
  await MessageService.decideApproach(rec05.id, app5.approach.id, 'SAVED');
  await RecruiterService.setBookmark(
    rec05.id,
    devBeta.id,
    'Strong candidate bookmarked for Q3 cloud automation initiatives'
  );
  console.log(`   [5/5] SAVED approach & recruiter bookmark created (dev_beta <-> rec05)`);

  // 2 DIRECT conversations initiated by recruiter via startDirectConversation
  const direct1 = await MessageService.startDirectConversation(
    rec06.id,
    'seed_dev_alpha',
    'Hello Alex! Our engineering team reviewed your verified React and JavaScript profile on SkillProof and was very impressed. We are building the next-generation robotics mission control console and would love to speak with you.',
    'Direct sourcing: Top verified frontend benchmark score for robotics dashboard'
  );
  await MessageService.sendMessage(
    devAlpha.id,
    direct1.conversationId,
    'Hi Helena, thank you for reaching out! A mission control console sounds like an exciting engineering challenge. I would love to connect.'
  );
  console.log(`   [Direct 1/2] Recruiter Helena Helix (Helix Robotics) -> dev_alpha with reply`);

  const direct2 = await MessageService.startDirectConversation(
    rec07.id,
    'seed_dev_gamma',
    'Greetings Samira, your verified benchmarks in Java and Core Algorithms place you among the strongest candidates on the platform. We are scaling our high-throughput checkout engine and wanted to introduce ourselves.',
    'Direct sourcing: Elite Core Java benchmark results for transaction infrastructure'
  );
  console.log(`   [Direct 2/2] Recruiter Oliver Orbit (Orbit Commerce) -> dev_gamma`);

  // 8. Final Audit and Verification
  const realAccountsAfter = await prisma.user.count({ where: { isSeed: false } });
  if (realAccountsBefore !== realAccountsAfter) {
    throw new Error(
      `CRITICAL: Real accounts changed! Before: ${realAccountsBefore}, After: ${realAccountsAfter}`
    );
  }

  const seededRecruitersCount = await prisma.user.count({
    where: { isSeed: true, role: 'RECRUITER' },
  });
  const seededVerifiedRecruiters = await prisma.recruiterProfile.count({
    where: { isVerified: true, user: { isSeed: true } },
  });
  const seededUnverifiedRecruiters = await prisma.recruiterProfile.count({
    where: { isVerified: false, user: { isSeed: true } },
  });

  const totalSeedOpenings = await prisma.opening.count({
    where: { recruiter: { isSeed: true } },
  });
  const activeOpenings = await prisma.opening.count({
    where: { recruiter: { isSeed: true }, status: 'ACTIVE' },
  });
  const pendingReviewOpenings = await prisma.opening.count({
    where: { recruiter: { isSeed: true }, status: 'PENDING_REVIEW' },
  });
  const rejectedOpenings = await prisma.opening.count({
    where: { recruiter: { isSeed: true }, status: 'REJECTED' },
  });
  const pausedOpenings = await prisma.opening.count({
    where: { recruiter: { isSeed: true }, status: 'PAUSED' },
  });
  const closedOpenings = await prisma.opening.count({
    where: { recruiter: { isSeed: true }, status: 'CLOSED' },
  });
  const expiredOpenings = await prisma.opening.count({
    where: { recruiter: { isSeed: true }, status: 'EXPIRED' },
  });

  const totalSeedApproaches = await prisma.approach.count({
    where: { developer: { isSeed: true } },
  });
  const totalSeedConversations = await prisma.conversation.count({
    where: { recruiter: { isSeed: true } },
  });
  const totalNotifications = await prisma.notification.count({
    where: { user: { isSeed: true } },
  });

  // Print Summary Tables
  console.log('\n================================================================================');
  console.log('📋 SKILLPROOF RECRUITER & OPENINGS ECOSYSTEM SEED REPORT');
  console.log('================================================================================');

  const recruiterSummary = RECRUITERS_SPEC.map((r) => ({
    Username: r.username,
    Name: r.name,
    Company: r.companyName,
    Title: r.jobTitle,
    Email: r.email,
    Verified: r.isVerified ? 'YES (Verified)' : 'NO (Pending)',
  }));
  console.table(recruiterSummary);

  console.log('\n📊 OPENINGS BY STATUS & TRACK:');
  console.table([
    {
      Total: totalSeedOpenings,
      ACTIVE: activeOpenings,
      PENDING_REVIEW: pendingReviewOpenings,
      REJECTED: rejectedOpenings,
      PAUSED: pausedOpenings,
      CLOSED: closedOpenings,
      EXPIRED: expiredOpenings,
    },
  ]);

  const trackBreakdown = await prisma.opening.groupBy({
    by: ['trackId', 'status'],
    where: { recruiter: { isSeed: true } },
    _count: { id: true },
  });

  const trackRows = trackBreakdown.map((tb) => {
    const tr = tracks.find((t) => t.id === tb.trackId);
    return {
      Track: tr?.name || tb.trackId,
      Status: tb.status,
      Count: tb._count.id,
    };
  });
  console.table(trackRows);

  console.log('\n📬 ACTIVITY SUMMARY:');
  console.table([
    {
      'Seeded Recruiters': seededRecruitersCount,
      'Verified Recruiters': seededVerifiedRecruiters,
      'Pending Recruiters': seededUnverifiedRecruiters,
      'Seeded Developers': createdDevelopers.size,
      'Total Openings': totalSeedOpenings,
      'Total Approaches': totalSeedApproaches,
      'Total Conversations': totalSeedConversations,
      'Seed Notifications': totalNotifications,
      'Real Accounts Untouched': `${realAccountsBefore} -> ${realAccountsAfter} (0 changes)`,
    },
  ]);

  console.log('🔑 SHARED SEED CREDENTIALS (for testing live):');
  console.log(`   Password for all seed accounts: ${SHARED_SEED_PASSWORD}`);
  console.log('   Recruiter Logins:  recruiter01@seed.skillproof.test ... recruiter12@seed.skillproof.test');
  console.log('   Developer Logins:  dev_alpha@seed.skillproof.test, dev_beta@seed.skillproof.test, dev_gamma@seed.skillproof.test');
  console.log('================================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

