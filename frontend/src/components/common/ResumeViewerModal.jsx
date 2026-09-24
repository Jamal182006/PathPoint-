import React, { useState } from 'react';
import Modal from './Modal';
import {
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Code,
  Briefcase,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

const RESUME_PROFILES = {
  'Resume_Frontend_v3.pdf': {
    title: 'Frontend Infrastructure & UI Engineer',
    summary:
      'Senior frontend engineer specializing in React 18/19, TypeScript, state synchronization architecture, and design systems. Track record of optimizing core web vitals and reducing bundle sizes across high-traffic platforms.',
    skills: [
      'React 18/19',
      'TypeScript',
      'Next.js',
      'Tailwind CSS',
      'Redux Toolkit / Zustand',
      'Vite & Webpack',
      'Web Vitals & Performance',
      'Jest & Playwright',
    ],
    experience: [
      {
        role: 'Frontend Systems Specialist',
        company: 'WebSphere Labs',
        period: '2024 - Present',
        bullets: [
          'Engineered micro-frontend build toolchain cutting production bundle sizes by 38%.',
          'Architected reusable WCAG 2.1 AA accessible component library adopted across 14 product squads.',
          'Spearheaded state cache invalidation layer reducing API network payloads by 42%.',
        ],
      },
      {
        role: 'UI/UX Developer',
        company: 'Pulse Digital',
        period: '2022 - 2024',
        bullets: [
          'Developed responsive real-time analytics dash with high-frequency WebSocket data stream.',
          'Partnered with designers to implement token-based dark mode theme architecture.',
        ],
      },
    ],
    education: {
      degree: 'B.S. in Computer Science',
      school: 'University of Technology',
      year: '2022 (GPA: 3.85 / 4.0)',
    },
  },
  'Resume_FullStack_v4.pdf': {
    title: 'Full Stack Engineer (Node.js / React)',
    summary:
      'Product-minded full-stack developer with 3+ years building scalable microservices and dynamic web interfaces. Experienced with distributed MongoDB databases, Express REST APIs, and modern React client applications.',
    skills: [
      'Node.js & Express',
      'MongoDB & Mongoose',
      'React & Redux',
      'REST & GraphQL APIs',
      'Docker & AWS ECS',
      'Redis Caching',
      'CI/CD Pipelines',
      'Tailwind CSS',
    ],
    experience: [
      {
        role: 'Full Stack Software Engineer',
        company: 'CloudStream Systems',
        period: '2023 - Present',
        bullets: [
          'Built scalable backend services handling 1.5M daily webhook ingestion events.',
          'Migrated legacy monolith endpoints to optimized Express microservices.',
          'Authored comprehensive automated unit and integration test suites with 92% code coverage.',
        ],
      },
    ],
    education: {
      degree: 'B.S. in Computer Science',
      school: 'University of Technology',
      year: '2022',
    },
  },
  'Resume_DesignEng_v2.pdf': {
    title: 'Design Technologist & UI Engineer',
    summary:
      'Bridging the gap between Figma design systems and production React frontends. Obsessed with interaction design, 60fps micro-interactions, accessibility, and design tokens.',
    skills: [
      'Design Systems',
      'Figma to Code',
      'Framer Motion',
      'Tailwind CSS',
      'Accessibility (A11y)',
      'React & TypeScript',
      'Storybook',
      'Design Tokens',
    ],
    experience: [
      {
        role: 'Design Systems Engineer',
        company: 'Canvas Craft Studio',
        period: '2023 - Present',
        bullets: [
          'Created unified multi-brand design token pipeline connecting Figma Variables to CSS variables.',
          'Decreased UI bug reports by 60% with automated visual regression tests in Storybook.',
        ],
      },
    ],
    education: {
      degree: 'B.S. in Computer Science & Interactive Media',
      school: 'University of Technology',
      year: '2022',
    },
  },
  default: {
    title: 'Full Stack Software Engineer',
    summary:
      'Passionate software developer with solid grounding in data structures, algorithms, and full-stack web application development.',
    skills: ['JavaScript / TypeScript', 'React', 'Node.js', 'Express', 'MongoDB', 'Git', 'Tailwind CSS'],
    experience: [
      {
        role: 'Software Engineer',
        company: 'Tech Solutions Inc.',
        period: '2023 - Present',
        bullets: [
          'Contributed to core product features and modern web client modernization.',
          'Collaborated closely with product managers and QA on sprint deliverables.',
        ],
      },
    ],
    education: {
      degree: 'B.S. in Computer Science',
      school: 'University of Technology',
      year: '2022',
    },
  },
};

export const ResumeViewerModal = ({ isOpen, onClose, application, user }) => {
  const [selectedVersion, setSelectedVersion] = useState(
    application?.resumeVersion || 'Resume_Frontend_v3.pdf'
  );
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentProfile =
    RESUME_PROFILES[selectedVersion] || RESUME_PROFILES.default;

  const handleCopyText = () => {
    const text = `${user?.name || 'Alex Morgan'} - ${currentProfile.title}\n\nSummary:\n${currentProfile.summary}\n\nSkills:\n${currentProfile.skills.join(', ')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resume Document Viewer" maxWidth="max-w-3xl">
      {/* Top Bar with Version Switcher and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Viewing Document:
          </span>
          <select
            value={selectedVersion}
            onChange={(e) => setSelectedVersion(e.target.value)}
            className="text-xs font-semibold border border-slate-300 rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
          >
            <option value="Resume_Frontend_v3.pdf">Resume_Frontend_v3.pdf (Frontend Infrastructure)</option>
            <option value="Resume_FullStack_v4.pdf">Resume_FullStack_v4.pdf (Full Stack Node/React)</option>
            <option value="Resume_DesignEng_v2.pdf">Resume_DesignEng_v2.pdf (Design Systems)</option>
            <option value="Resume_AlexMorgan_General.pdf">Resume_AlexMorgan_General.pdf (General SWE)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyText}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download / Print</span>
          </button>
        </div>
      </div>

      {/* Styled Resume Document Sheet */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-md text-slate-800 space-y-6 max-h-[65vh] overflow-y-auto font-sans">
        {/* Header */}
        <div className="border-b border-slate-200 pb-4 text-center sm:text-left">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {user?.name || 'Alex Morgan'}
          </h1>
          <h2 className="text-sm font-semibold text-indigo-600 mt-0.5">
            {currentProfile.title}
          </h2>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
            <span>{user?.email || 'alex.morgan@email.com'}</span>
            <span>•</span>
            <span>(555) 349-2810</span>
            <span>•</span>
            <span>San Francisco, CA (Open to Remote)</span>
            <span>•</span>
            <span className="text-indigo-600 font-medium">linkedin.com/in/alexmorgan</span>
          </div>
        </div>

        {/* Summary */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Professional Summary</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {currentProfile.summary}
          </p>
        </div>

        {/* Technical Skills */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <Code className="w-3.5 h-3.5 text-indigo-500" />
            <span>Core Competencies & Technologies</span>
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {currentProfile.skills.map((skill) => (
              <span
                key={skill}
                className="px-2.5 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-800 border border-slate-200"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Experience */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
            <span>Professional Experience</span>
          </h3>
          <div className="space-y-4">
            {currentProfile.experience.map((exp, idx) => (
              <div key={idx} className="text-xs sm:text-sm">
                <div className="flex justify-between items-baseline font-semibold text-slate-900">
                  <span>{exp.role}</span>
                  <span className="text-xs text-slate-500 font-normal">{exp.period}</span>
                </div>
                <div className="text-xs text-indigo-600 font-medium mb-1.5">{exp.company}</div>
                <ul className="list-disc list-inside space-y-1 text-slate-700 text-xs">
                  {exp.bullets.map((b, bIdx) => (
                    <li key={bIdx}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Education */}
        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
            <span>Education</span>
          </h3>
          <div className="text-xs sm:text-sm flex justify-between">
            <div>
              <div className="font-semibold text-slate-900">{currentProfile.education.degree}</div>
              <div className="text-xs text-slate-600">{currentProfile.education.school}</div>
            </div>
            <div className="text-xs text-slate-500">{currentProfile.education.year}</div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ResumeViewerModal;
