import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SKILLPROOF database seeding...');

  // Clean existing tables
  await prisma.auditLog.deleteMany();
  await prisma.report.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.recruiterBookmark.deleteMany();
  await prisma.verificationDocument.deleteMany();
  await prisma.verificationRequest.deleteMany();
  await prisma.assessmentAnswer.deleteMany();
  await prisma.assessmentAttempt.deleteMany();
  await prisma.assessmentOption.deleteMany();
  await prisma.assessmentQuestion.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.certification.deleteMany();
  await prisma.education.deleteMany();
  await prisma.projectTechnology.deleteMany();
  await prisma.project.deleteMany();
  await prisma.userSkill.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  const passwordAdmin = await bcrypt.hash('Admin@123', 10);
  const passwordRecruiter = await bcrypt.hash('Recruiter@123', 10);
  const passwordDev = await bcrypt.hash('Dev@123', 10);

  // 1. Create Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@skillproof.dev',
      password_hash: passwordAdmin,
      role: 'ADMIN',
      status: 'ACTIVE',
      profile: {
        create: {
          name: 'System Administrator',
          username: 'admin',
          headline: 'Platform Operations & Skill Verification Director',
          bio: 'Managing skill standards, audit verification accuracy, and community safety.',
          location: 'San Francisco, CA',
          profile_completion: 100,
        },
      },
    },
    include: { profile: true },
  });

  // 2. Create Recruiter Users
  const recruiter1 = await prisma.user.create({
    data: {
      email: 'recruiter1@techcorp.com',
      password_hash: passwordRecruiter,
      role: 'RECRUITER',
      status: 'ACTIVE',
      profile: {
        create: {
          name: 'Sarah Jenkins',
          username: 'sjenkins',
          headline: 'Senior Technical Recruiter at TechCorp',
          bio: 'Looking for verified React, Node.js, and Cloud engineers with proven skill evidence.',
          location: 'San Francisco, CA',
          profile_completion: 90,
        },
      },
    },
  });

  const recruiter2 = await prisma.user.create({
    data: {
      email: 'recruiter2@globaldev.com',
      password_hash: passwordRecruiter,
      role: 'RECRUITER',
      status: 'ACTIVE',
      profile: {
        create: {
          name: 'Marcus Vance',
          username: 'mvance',
          headline: 'Talent Acquisition Director at GlobalDev Solutions',
          bio: 'Sourcing top-tier full-stack talent with verified assessment credentials.',
          location: 'New York, NY',
          profile_completion: 85,
        },
      },
    },
  });

  // 3. Create Skills
  const skillsData = [
    { name: 'React', category: 'Frontend', description: 'Component-based UI library for building interactive web interfaces.' },
    { name: 'JavaScript', category: 'Languages', description: 'Core programming language of the web, supporting async event-driven architecture.' },
    { name: 'TypeScript', category: 'Languages', description: 'Typed superset of JavaScript that scales to enterprise codebases.' },
    { name: 'Node.js', category: 'Backend', description: 'Asynchronous event-driven JavaScript runtime for server-side APIs.' },
    { name: 'Express', category: 'Backend', description: 'Fast, unopinionated, minimalist web framework for Node.js.' },
    { name: 'Python', category: 'Languages', description: 'Versatile language for backend services, automation, and data science.' },
    { name: 'Java', category: 'Languages', description: 'Object-oriented language widely used in enterprise backend systems.' },
    { name: 'C++', category: 'Languages', description: 'High-performance system programming language.' },
    { name: 'SQL', category: 'Database', description: 'Standard language for relational database querying, schema design, and indexing.' },
    { name: 'Docker', category: 'DevOps', description: 'Containerization technology for lightweight isolated application deployment.' },
  ];

  const createdSkills: Record<string, any> = {};
  for (const skillItem of skillsData) {
    const s = await prisma.skill.create({ data: skillItem });
    createdSkills[s.name] = s;
  }

  // 4. Create Developers
  // Developer 1: Arjun Balaji
  const devArjun = await prisma.user.create({
    data: {
      email: 'arjun@skillproof.dev',
      password_hash: passwordDev,
      role: 'DEVELOPER',
      status: 'ACTIVE',
      profile: {
        create: {
          name: 'Arjun Balaji',
          username: 'arjun',
          headline: 'Senior Full-Stack Engineer | React, Node.js & Cloud Architecture',
          bio: 'Passionate full-stack developer with 5+ years of experience crafting high-throughput web applications, microservices, and database systems. Driven by clean code and verified technical excellence.',
          location: 'Chennai, India',
          github_url: 'https://github.com/arjunbalaji',
          linkedin_url: 'https://linkedin.com/in/arjunbalaji',
          portfolio_url: 'https://arjunbalaji.dev',
          years_experience: 5,
          profile_completion: 95,
        },
      },
    },
    include: { profile: true },
  });

  // Developer 2: Priya Sharma
  const devPriya = await prisma.user.create({
    data: {
      email: 'priya@skillproof.dev',
      password_hash: passwordDev,
      role: 'DEVELOPER',
      status: 'ACTIVE',
      profile: {
        create: {
          name: 'Priya Sharma',
          username: 'priyasharma',
          headline: 'Frontend Lead & UI/UX Specialist | React & TypeScript',
          bio: 'Specializing in design systems, web performance, accessibility, and modern React architectures.',
          location: 'Bengaluru, India',
          github_url: 'https://github.com/priyasharma',
          linkedin_url: 'https://linkedin.com/in/priyasharma',
          years_experience: 4,
          profile_completion: 90,
        },
      },
    },
    include: { profile: true },
  });

  // Developer 3: John Doe
  const devJohn = await prisma.user.create({
    data: {
      email: 'john.doe@skillproof.dev',
      password_hash: passwordDev,
      role: 'DEVELOPER',
      status: 'ACTIVE',
      profile: {
        create: {
          name: 'John Doe',
          username: 'johndoe',
          headline: 'Backend Developer & Database Architect | Node.js & Python',
          bio: 'Architecting distributed backend microservices, relational schemas, and real-time streaming engines.',
          location: 'San Francisco, CA',
          github_url: 'https://github.com/johndoe',
          years_experience: 6,
          profile_completion: 85,
        },
      },
    },
    include: { profile: true },
  });

  // Developer 4: Alex Chen
  const devAlex = await prisma.user.create({
    data: {
      email: 'alex.chen@skillproof.dev',
      password_hash: passwordDev,
      role: 'DEVELOPER',
      status: 'ACTIVE',
      profile: {
        create: {
          name: 'Alex Chen',
          username: 'alexchen',
          headline: 'DevOps & Systems Engineer | Docker, Java & Go',
          bio: 'Automating CI/CD pipelines, container orchestration, and cloud infrastructure management.',
          location: 'Seattle, WA',
          github_url: 'https://github.com/alexchen',
          years_experience: 3,
          profile_completion: 80,
        },
      },
    },
    include: { profile: true },
  });

  // Developer 5: David Miller
  const devDavid = await prisma.user.create({
    data: {
      email: 'dev.user@skillproof.dev',
      password_hash: passwordDev,
      role: 'DEVELOPER',
      status: 'ACTIVE',
      profile: {
        create: {
          name: 'David Miller',
          username: 'davidm',
          headline: 'Full-Stack Web Developer & Open Source Enthusiast',
          bio: 'Eager software engineer building responsive client interfaces and API services.',
          location: 'Austin, TX',
          github_url: 'https://github.com/davidm',
          years_experience: 2,
          profile_completion: 75,
        },
      },
    },
    include: { profile: true },
  });

  // 5. Add User Skills for Arjun
  const userSkillsArjun = [
    {
      profile_id: devArjun.profile!.id,
      skill_id: createdSkills['React'].id,
      proficiency_level: 'EXPERT',
      verification_status: 'VERIFIED',
      verified_at: new Date(),
      verified_by: adminUser.id,
      verification_method: 'ASSESSMENT',
    },
    {
      profile_id: devArjun.profile!.id,
      skill_id: createdSkills['Node.js'].id,
      proficiency_level: 'ADVANCED',
      verification_status: 'VERIFIED',
      verified_at: new Date(),
      verified_by: adminUser.id,
      verification_method: 'PROJECT',
    },
    {
      profile_id: devArjun.profile!.id,
      skill_id: createdSkills['TypeScript'].id,
      proficiency_level: 'ADVANCED',
      verification_status: 'VERIFIED',
      verified_at: new Date(),
      verified_by: adminUser.id,
      verification_method: 'ASSESSMENT',
    },
    {
      profile_id: devArjun.profile!.id,
      skill_id: createdSkills['Express'].id,
      proficiency_level: 'ADVANCED',
      verification_status: 'VERIFIED',
      verified_at: new Date(),
      verified_by: adminUser.id,
      verification_method: 'CERTIFICATION',
    },
    {
      profile_id: devArjun.profile!.id,
      skill_id: createdSkills['SQL'].id,
      proficiency_level: 'INTERMEDIATE',
      verification_status: 'VERIFIED',
      verified_at: new Date(),
      verified_by: adminUser.id,
      verification_method: 'ASSESSMENT',
    },
    {
      profile_id: devArjun.profile!.id,
      skill_id: createdSkills['Docker'].id,
      proficiency_level: 'INTERMEDIATE',
      verification_status: 'PENDING',
    },
    {
      profile_id: devArjun.profile!.id,
      skill_id: createdSkills['Python'].id,
      proficiency_level: 'INTERMEDIATE',
      verification_status: 'UNVERIFIED',
    },
  ];

  for (const us of userSkillsArjun) {
    await prisma.userSkill.create({ data: us });
  }

  // Skills for Priya
  await prisma.userSkill.createMany({
    data: [
      { profile_id: devPriya.profile!.id, skill_id: createdSkills['React'].id, proficiency_level: 'EXPERT', verification_status: 'VERIFIED', verified_at: new Date(), verification_method: 'ASSESSMENT' },
      { profile_id: devPriya.profile!.id, skill_id: createdSkills['TypeScript'].id, proficiency_level: 'EXPERT', verification_status: 'VERIFIED', verified_at: new Date(), verification_method: 'CERTIFICATION' },
      { profile_id: devPriya.profile!.id, skill_id: createdSkills['JavaScript'].id, proficiency_level: 'EXPERT', verification_status: 'VERIFIED', verified_at: new Date(), verification_method: 'ASSESSMENT' },
    ],
  });

  // Skills for John
  await prisma.userSkill.createMany({
    data: [
      { profile_id: devJohn.profile!.id, skill_id: createdSkills['Node.js'].id, proficiency_level: 'EXPERT', verification_status: 'VERIFIED', verified_at: new Date(), verification_method: 'ASSESSMENT' },
      { profile_id: devJohn.profile!.id, skill_id: createdSkills['Python'].id, proficiency_level: 'ADVANCED', verification_status: 'VERIFIED', verified_at: new Date(), verification_method: 'PROJECT' },
      { profile_id: devJohn.profile!.id, skill_id: createdSkills['SQL'].id, proficiency_level: 'EXPERT', verification_status: 'VERIFIED', verified_at: new Date(), verification_method: 'ASSESSMENT' },
      { profile_id: devJohn.profile!.id, skill_id: createdSkills['Docker'].id, proficiency_level: 'ADVANCED', verification_status: 'VERIFIED', verified_at: new Date(), verification_method: 'DOCUMENT' },
    ],
  });

  // Skills for Alex
  await prisma.userSkill.createMany({
    data: [
      { profile_id: devAlex.profile!.id, skill_id: createdSkills['Docker'].id, proficiency_level: 'EXPERT', verification_status: 'VERIFIED', verified_at: new Date(), verification_method: 'ASSESSMENT' },
      { profile_id: devAlex.profile!.id, skill_id: createdSkills['Java'].id, proficiency_level: 'ADVANCED', verification_status: 'VERIFIED', verified_at: new Date(), verification_method: 'CERTIFICATION' },
      { profile_id: devAlex.profile!.id, skill_id: createdSkills['C++'].id, proficiency_level: 'INTERMEDIATE', verification_status: 'UNVERIFIED' },
    ],
  });

  // Skills for David
  await prisma.userSkill.createMany({
    data: [
      { profile_id: devDavid.profile!.id, skill_id: createdSkills['JavaScript'].id, proficiency_level: 'ADVANCED', verification_status: 'VERIFIED', verified_at: new Date(), verification_method: 'ASSESSMENT' },
      { profile_id: devDavid.profile!.id, skill_id: createdSkills['React'].id, proficiency_level: 'INTERMEDIATE', verification_status: 'PENDING' },
      { profile_id: devDavid.profile!.id, skill_id: createdSkills['Express'].id, proficiency_level: 'INTERMEDIATE', verification_status: 'UNVERIFIED' },
    ],
  });

  // 6. Create Projects for Arjun
  const project1 = await prisma.project.create({
    data: {
      profile_id: devArjun.profile!.id,
      title: 'SKILLPROOF Platform',
      description: 'A database-backed full-stack developer portfolio and skill verification system featuring automated timed coding assessments, role-based recruiter access, and verified evidence workflows.',
      github_url: 'https://github.com/arjunbalaji/skillproof',
      live_url: 'https://skillproof.dev',
      start_date: '2024-01-01',
      end_date: '2024-06-30',
      status: 'COMPLETED',
      technologies: {
        create: [
          { technology_name: 'React' },
          { technology_name: 'TypeScript' },
          { technology_name: 'Node.js' },
          { technology_name: 'Express' },
          { technology_name: 'Prisma' },
          { technology_name: 'MariaDB' },
        ],
      },
    },
  });

  const project2 = await prisma.project.create({
    data: {
      profile_id: devArjun.profile!.id,
      title: 'Distributed Task Queue Scheduler',
      description: 'High-concurrency background job processing system built with Node.js and Redis, capable of handling 50,000 tasks/second with exponential backoff retries.',
      github_url: 'https://github.com/arjunbalaji/distributed-queue',
      start_date: '2023-08-15',
      end_date: '2023-12-10',
      status: 'COMPLETED',
      technologies: {
        create: [
          { technology_name: 'Node.js' },
          { technology_name: 'TypeScript' },
          { technology_name: 'Redis' },
          { technology_name: 'Docker' },
        ],
      },
    },
  });

  // 7. Education for Arjun
  await prisma.education.create({
    data: {
      profile_id: devArjun.profile!.id,
      institution: 'Indian Institute of Technology (IIT)',
      degree: 'Bachelor of Technology (B.Tech)',
      field_of_study: 'Computer Science & Engineering',
      start_date: '2019-08-01',
      end_date: '2023-05-30',
      grade: '8.9 / 10.0 CGPA',
      description: 'Specialized in Distributed Systems, Database Management Systems, and Software Architecture.',
    },
  });

  // 8. Certifications for Arjun
  await prisma.certification.create({
    data: {
      profile_id: devArjun.profile!.id,
      title: 'AWS Certified Solutions Architect – Associate',
      issuer: 'Amazon Web Services (AWS)',
      issue_date: '2023-09-15',
      expiry_date: '2026-09-15',
      credential_id: 'AWS-ASA-84920419',
      credential_url: 'https://aws.amazon.com/verification/AWS-ASA-84920419',
    },
  });

  await prisma.certification.create({
    data: {
      profile_id: devArjun.profile!.id,
      title: 'Meta Front-End Developer Professional Certificate',
      issuer: 'Meta Coursera',
      issue_date: '2023-02-10',
      credential_id: 'META-FED-99201',
      credential_url: 'https://coursera.org/verify/META-FED-99201',
    },
  });

  // 9. Achievements for Arjun
  await prisma.achievement.create({
    data: {
      profile_id: devArjun.profile!.id,
      title: 'Grand Winner - National Full-Stack Hackathon 2024',
      description: 'Awarded 1st place among 400+ teams for building a real-time collaborative code editor with live syntax analysis.',
      date: '2024-03-20',
      issuer: 'Tech Excellence India',
    },
  });

  // 10. Assessments & Questions
  const reactAssessment = await prisma.assessment.create({
    data: {
      skill_id: createdSkills['React'].id,
      title: 'React Technical Assessment',
      description: 'Demonstrate your knowledge of modern React 18, Hooks, state management, Virtual DOM optimization, and component lifecycles.',
      time_limit_minutes: 15,
      passing_percentage: 70,
      total_questions: 5,
      questions: {
        create: [
          {
            question_text: 'What is the primary purpose of the React useMemo hook?',
            code_snippet: 'const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);',
            explanation: 'useMemo caches the calculated result of a function execution between re-renders unless dependency values change.',
            points: 1,
            options: {
              create: [
                { option_text: 'To memoize a callback function instance', is_correct: false },
                { option_text: 'To memoize the calculated result of an expensive computation', is_correct: true },
                { option_text: 'To trigger side-effects after DOM render', is_correct: false },
                { option_text: 'To store mutable values that do not trigger re-renders', is_correct: false },
              ],
            },
          },
          {
            question_text: 'Which hook should be used to interact directly with a DOM node in React?',
            code_snippet: 'const inputRef = useRef(null);',
            explanation: 'useRef returns a mutable ref object whose .current property is initialized to the passed argument.',
            points: 1,
            options: {
              create: [
                { option_text: 'useRef', is_correct: true },
                { option_text: 'useState', is_correct: false },
                { option_text: 'useImperativeHandle', is_correct: false },
                { option_text: 'useContext', is_correct: false },
              ],
            },
          },
          {
            question_text: 'How does React Virtual DOM improve web application performance?',
            explanation: 'React compares the Virtual DOM with a snapshot of the previous tree (reconciler/diffing) and batches only required updates to the real DOM.',
            points: 1,
            options: {
              create: [
                { option_text: 'By bypassing the browser DOM entirely', is_correct: false },
                { option_text: 'By performing batch diffing and selectively updating only changed real DOM nodes', is_correct: true },
                { option_text: 'By executing JavaScript code directly inside the GPU', is_correct: false },
                { option_text: 'By compiling React JSX into WebAssembly', is_correct: false },
              ],
            },
          },
          {
            question_text: 'When using useEffect, what happens when you pass an empty dependency array []?',
            code_snippet: 'useEffect(() => { console.log("Mounted"); }, []);',
            explanation: 'An empty dependency array tells React that the effect does not rely on any props or state, so it runs only once after initial mount.',
            points: 1,
            options: {
              create: [
                { option_text: 'The effect runs on every single render', is_correct: false },
                { option_text: 'The effect runs only once after the component mounts', is_correct: true },
                { option_text: 'The effect never executes', is_correct: false },
                { option_text: 'The effect runs right before unmounting only', is_correct: false },
              ],
            },
          },
          {
            question_text: 'In React Context API, what is the role of the Provider component?',
            explanation: 'The Context Provider allows consuming components to subscribe to context changes.',
            points: 1,
            options: {
              create: [
                { option_text: 'To pass data down the component tree without manually threading props at every level', is_correct: true },
                { option_text: 'To persist state in localStorage automatically', is_correct: false },
                { option_text: 'To handle HTTP REST API network calls', is_correct: false },
                { option_text: 'To replace Redux middleware for async actions', is_correct: false },
              ],
            },
          },
        ],
      },
    },
  });

  const nodeAssessment = await prisma.assessment.create({
    data: {
      skill_id: createdSkills['Node.js'].id,
      title: 'Node.js & Async Architecture Assessment',
      description: 'Evaluate your expertise in Node.js event loop, non-blocking I/O, streams, and Express server development.',
      time_limit_minutes: 15,
      passing_percentage: 70,
      total_questions: 4,
      questions: {
        create: [
          {
            question_text: 'Which component in Node.js is responsible for handling non-blocking asynchronous I/O operations via thread pool?',
            explanation: 'libuv is a multi-platform C library that provides asynchronous I/O abstraction and event loop pooling in Node.js.',
            points: 1,
            options: {
              create: [
                { option_text: 'V8 Engine', is_correct: false },
                { option_text: 'libuv', is_correct: true },
                { option_text: 'npm', is_correct: false },
                { option_text: 'http-parser', is_correct: false },
              ],
            },
          },
          {
            question_text: 'What will be the execution order of console output in this Node.js script?',
            code_snippet: `console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');`,
            explanation: 'Synchronous code runs first (1, 4). Microtasks (Promises) run before macrotasks (setTimeout) (3, then 2). Output: 1, 4, 3, 2.',
            points: 1,
            options: {
              create: [
                { option_text: '1, 2, 3, 4', is_correct: false },
                { option_text: '1, 4, 3, 2', is_correct: true },
                { option_text: '1, 4, 2, 3', is_correct: false },
                { option_text: '3, 1, 4, 2', is_correct: false },
              ],
            },
          },
          {
            question_text: 'What Express middleware parameter signature is required for error-handling middleware?',
            explanation: 'Express recognizes error handling middleware by enforcing four parameters: (err, req, res, next).',
            points: 1,
            options: {
              create: [
                { option_text: '(req, res, next)', is_correct: false },
                { option_text: '(err, req, res, next)', is_correct: true },
                { option_text: '(err, req, res)', is_correct: false },
                { option_text: '(req, res, err)', is_correct: false },
              ],
            },
          },
          {
            question_text: 'Why are Streams preferred over fs.readFile when sending large files to HTTP clients?',
            explanation: 'Streams process data chunk-by-chunk without loading the entire multi-gigabyte file into memory simultaneously.',
            points: 1,
            options: {
              create: [
                { option_text: 'Streams encrypt data automatically', is_correct: false },
                { option_text: 'Streams process data in memory-efficient chunks instead of buffering the whole file in RAM', is_correct: true },
                { option_text: 'Streams bypass TCP packets', is_correct: false },
                { option_text: 'Streams run multi-threaded GPU jobs', is_correct: false },
              ],
            },
          },
        ],
      },
    },
  });

  // 11. Create Sample Assessment Attempts for Arjun
  const attemptArjunReact = await prisma.assessmentAttempt.create({
    data: {
      user_id: devArjun.id,
      assessment_id: reactAssessment.id,
      start_time: new Date(Date.now() - 3600000),
      end_time: new Date(Date.now() - 3000000),
      total_questions: 5,
      correct_answers: 5,
      score: 5.0,
      percentage: 100.0,
      status: 'PASSED',
    },
  });

  // 12. Verification Requests
  const dockerUserSkill = await prisma.userSkill.findFirst({
    where: { profile_id: devArjun.profile!.id, skill_id: createdSkills['Docker'].id },
  });

  if (dockerUserSkill) {
    const vr = await prisma.verificationRequest.create({
      data: {
        user_id: devArjun.id,
        user_skill_id: dockerUserSkill.id,
        method: 'DOCUMENT',
        status: 'PENDING',
        documents: {
          create: [
            {
              file_path: '/uploads/proof_docker_cert_arjun.pdf',
              file_name: 'Docker_Certified_Associate_Proof.pdf',
              file_type: 'application/pdf',
              file_size: 1024500,
            },
          ],
        },
      },
    });
  }

  // 13. Recruiter Bookmarks
  await prisma.recruiterBookmark.create({
    data: {
      recruiter_id: recruiter1.id,
      developer_id: devArjun.id,
    },
  });

  // 14. Notifications
  await prisma.notification.createMany({
    data: [
      {
        user_id: devArjun.id,
        title: 'React Skill Verified! 🎉',
        message: 'Congratulations! You passed the React Technical Assessment with 100% and earned a Verified Skill badge on your portfolio.',
        type: 'SUCCESS',
        is_read: true,
      },
      {
        user_id: devArjun.id,
        title: 'Verification Request Submitted',
        message: 'Your verification request for Docker containerization proof has been received and is under review by admin.',
        type: 'INFO',
        is_read: false,
      },
    ],
  });

  // 15. Audit Log
  await prisma.auditLog.createMany({
    data: [
      { user_id: adminUser.id, action: 'SYSTEM_SEED', entity_type: 'DATABASE', metadata: JSON.stringify({ note: 'Initial seed database executed successfully' }) },
      { user_id: devArjun.id, action: 'ASSESSMENT_PASSED', entity_type: 'ASSESSMENT', entity_id: reactAssessment.id, metadata: JSON.stringify({ score: 100, skill: 'React' }) },
      { user_id: recruiter1.id, action: 'BOOKMARK_DEVELOPER', entity_type: 'USER', entity_id: devArjun.id, metadata: JSON.stringify({ developer_name: 'Arjun Balaji' }) },
    ],
  });

  console.log('✅ SKILLPROOF database seeding completed successfully!');
  console.log('🔑 Credentials summary:');
  console.log('   Admin: admin@skillproof.dev / Admin@123');
  console.log('   Recruiter: recruiter1@techcorp.com / Recruiter@123');
  console.log('   Developer: arjun@skillproof.dev / Dev@123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

