import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import KanbanCard from './KanbanCard';
import { Plus } from 'lucide-react';

const COLUMN_COLORS = {
  Saved: {
    borderTop: 'border-t-slate-400',
    headerBadge: 'bg-slate-100 text-slate-700',
    dot: 'bg-slate-400',
  },
  Applied: {
    borderTop: 'border-t-blue-500',
    headerBadge: 'bg-blue-100 text-blue-800',
    dot: 'bg-blue-500',
  },
  Interviewing: {
    borderTop: 'border-t-amber-500',
    headerBadge: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-500 animate-pulse',
  },
  Offered: {
    borderTop: 'border-t-emerald-500',
    headerBadge: 'bg-emerald-100 text-emerald-800',
    dot: 'bg-emerald-500',
  },
  Rejected: {
    borderTop: 'border-t-rose-500',
    headerBadge: 'bg-rose-100 text-rose-800',
    dot: 'bg-rose-500',
  },
};

export const KanbanColumn = ({ status, applications = [], onAddClick }) => {
  const colors = COLUMN_COLORS[status] || COLUMN_COLORS.Saved;

  return (
    <div
      className={`flex flex-col flex-1 min-w-[280px] max-w-xs bg-slate-100/75 rounded-2xl border-t-4 ${colors.borderTop} border border-slate-200/80 p-3 h-[calc(100vh-210px)] min-h-[500px]`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200/60 px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
          <h3 className="font-semibold text-slate-800 text-sm">{status}</h3>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${colors.headerBadge}`}
          >
            {applications.length}
          </span>
        </div>

        {onAddClick && (
          <button
            onClick={() => onAddClick(status)}
            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-white transition"
            title={`Add application to ${status}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto space-y-2.5 pr-1 transition-colors rounded-xl p-1 ${
              snapshot.isDraggingOver ? 'bg-indigo-50/50 ring-2 ring-indigo-200' : ''
            }`}
          >
            {applications.map((app, index) => (
              <KanbanCard key={app._id} application={app} index={index} />
            ))}
            {provided.placeholder}

            {applications.length === 0 && !snapshot.isDraggingOver && (
              <div className="h-32 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                <span>No applications</span>
                <span className="text-[11px] text-slate-400 mt-0.5">Drag cards here</span>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;
