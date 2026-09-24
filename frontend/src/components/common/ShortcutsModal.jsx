import React from 'react';
import Modal from './Modal';
import { Command, Keyboard } from 'lucide-react';

export const ShortcutsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'N', description: 'Log a new job application' },
    { key: '/', description: 'Focus company/role search field' },
    { key: 'B', description: 'Switch to Kanban Status Board view' },
    { key: 'L', description: 'Switch to Tabular List view' },
    { key: 'C', description: 'Open Interview Scheduler & Calendar' },
    { key: 'A', description: 'Open Analytics & Conversion Dashboard' },
    { key: '?', description: 'Open this keyboard shortcuts cheat sheet' },
    { key: 'Esc', description: 'Close any active modal or pop-up' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" maxWidth="max-w-md">
      <div className="space-y-4 text-slate-700">
        <p className="text-xs text-slate-500">
          Navigate PathPoint rapidly with single-key shortcuts:
        </p>

        <div className="divide-y divide-slate-100">
          {shortcuts.map((sc, idx) => (
            <div key={idx} className="py-2 flex items-center justify-between text-xs">
              <span className="text-slate-700 font-medium">{sc.description}</span>
              <kbd className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300 rounded shadow-xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 text-center">
          <span className="text-[11px] text-slate-400">
            Press <kbd className="font-mono bg-slate-100 px-1 rounded border">Esc</kbd> anytime to dismiss.
          </span>
        </div>
      </div>
    </Modal>
  );
};

export default ShortcutsModal;
