import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Sparkles,
  HelpCircle,
  MessageSquare,
  Plus,
  Trash2,
} from 'lucide-react';

const DEFAULT_TASKS = [
  { id: 't1', label: 'Review company mission, recent news, and product lines', done: true },
  { id: 't2', label: 'Review job requirements & prepare 3 tailored project stories', done: true },
  { id: 't3', label: 'Prepare STAR method answers for standard behavioral questions', done: false },
  { id: 't4', label: 'Practice technical coding questions on core data structures', done: false },
  { id: 't5', label: 'Prepare 4-5 thoughtful questions to ask the interviewers', done: false },
  { id: 't6', label: 'Test webcam, microphone, audio, and quiet environment', done: false },
];

const DEFAULT_QUESTIONS_TO_ASK = [
  'What does a typical day look like for an engineer on this team?',
  'How does the engineering team handle technical debt vs. new feature velocity?',
  'What are the biggest technical challenges the team is tackling in the next 6-12 months?',
];

export const InterviewPrepChecklist = ({ company, role }) => {
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [newTaskText, setNewTaskText] = useState('');
  const [starNotes, setStarNotes] = useState({
    situation: '',
    task: '',
    action: '',
    result: '',
  });
  const [questionsToAsk, setQuestionsToAsk] = useState(DEFAULT_QUESTIONS_TO_ASK);
  const [newQuestionText, setNewQuestionText] = useState('');

  const toggleTask = (id) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks((prev) => [
      ...prev,
      { id: `custom-${Date.now()}`, label: newTaskText.trim(), done: false },
    ]);
    setNewTaskText('');
  };

  const handleAddQuestion = (e) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;
    setQuestionsToAsk((prev) => [...prev, newQuestionText.trim()]);
    setNewQuestionText('');
  };

  const handleRemoveQuestion = (idx) => {
    setQuestionsToAsk((prev) => prev.filter((_, i) => i !== idx));
  };

  const completedCount = tasks.filter((t) => t.done).length;

  return (
    <div className="space-y-6 text-slate-800">
      {/* Preparation Checklist */}
      <div className="ui-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-brand-600" />
            <h3 className="font-semibold text-slate-900 text-sm">
              Interview Readiness Checklist ({completedCount}/{tasks.length})
            </h3>
          </div>
          <span className="ui-badge ui-badge-brand">
            {Math.round((completedCount / tasks.length) * 100)}% Ready
          </span>
        </div>

        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => toggleTask(task.id)}
              className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition text-xs select-none ${
                task.done
                  ? 'bg-slate-50 border-slate-200 text-slate-500 line-through'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-brand-300'
              }`}
            >
              {task.done ? (
                <CheckSquare className="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Square className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              )}
              <span className="font-medium">{task.label}</span>
            </div>
          ))}
        </div>

        {/* Add Custom Task */}
        <form onSubmit={handleAddTask} className="flex gap-2 pt-2">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="Add custom prep item (e.g. review dynamic programming)..."
            className="ui-input flex-1"
          />
          <button
            type="submit"
            className="ui-btn ui-btn-secondary ui-btn-sm"
          >
            Add
          </button>
        </form>
      </div>

      {/* STAR Method Behavioral Prep Notes */}
      <div className="ui-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-600" />
          <h3 className="font-semibold text-slate-900 text-sm">
            STAR Method Story Builder for {company}
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Structure your story for behavioral questions: <em>Situation, Task, Action, Result</em>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="ui-label">
              1. Situation (Context)
            </label>
            <textarea
              rows={2}
              value={starNotes.situation}
              onChange={(e) => setStarNotes({ ...starNotes, situation: e.target.value })}
              placeholder="What was the background? What challenge arose?"
              className="ui-input"
            />
          </div>

          <div>
            <label className="ui-label">
              2. Task (Responsibility)
            </label>
            <textarea
              rows={2}
              value={starNotes.task}
              onChange={(e) => setStarNotes({ ...starNotes, task: e.target.value })}
              placeholder="What was your specific goal or deliverable?"
              className="ui-input"
            />
          </div>

          <div>
            <label className="ui-label">
              3. Action (Steps Taken)
            </label>
            <textarea
              rows={2}
              value={starNotes.action}
              onChange={(e) => setStarNotes({ ...starNotes, action: e.target.value })}
              placeholder="What exact technical or team actions did you lead?"
              className="ui-input"
            />
          </div>

          <div>
            <label className="ui-label">
              4. Result (Impact & Metrics)
            </label>
            <textarea
              rows={2}
              value={starNotes.result}
              onChange={(e) => setStarNotes({ ...starNotes, result: e.target.value })}
              placeholder="What was the measurable outcome? (e.g. cut latency by 30%)"
              className="ui-input"
            />
          </div>
        </div>
      </div>

      {/* Questions to Ask Interviewer */}
      <div className="ui-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-brand-600" />
          <h3 className="font-semibold text-slate-900 text-sm">
            Questions to Ask Your Interviewers
          </h3>
        </div>

        <div className="space-y-2">
          {questionsToAsk.map((q, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-xs text-slate-700"
            >
              <span>{q}</span>
              <button
                type="button"
                onClick={() => handleRemoveQuestion(idx)}
                className="text-slate-500 hover:text-danger-600 p-1 transition"
                title="Remove question"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddQuestion} className="flex gap-2">
          <input
            type="text"
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            placeholder="Add custom question (e.g. How does the deployment pipeline look?)..."
            className="ui-input flex-1"
          />
          <button
            type="submit"
            className="ui-btn ui-btn-secondary ui-btn-sm"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
};

export default InterviewPrepChecklist;
