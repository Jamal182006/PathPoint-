import React from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import KanbanColumn from './KanbanColumn';

const COLUMNS = ['Saved', 'Applied', 'Interviewing', 'Offered', 'Rejected'];

export const KanbanBoard = ({ applications = [], onStatusChange, onAddClick }) => {
  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceStatus = source.droppableId;
    const destStatus = destination.droppableId;

    if (sourceStatus !== destStatus) {
      onStatusChange(draggableId, destStatus, sourceStatus);
    }
  };

  const groupedApps = COLUMNS.reduce((acc, status) => {
    acc[status] = applications.filter((app) => app.status === status);
    return acc;
  }, {});

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start">
        {COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            applications={groupedApps[status] || []}
            onAddClick={onAddClick}
          />
        ))}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
