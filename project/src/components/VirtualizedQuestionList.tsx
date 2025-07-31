import React, { useMemo } from 'react';
import type { Question } from '../types/Survey';

// For now, let's use a simpler approach without react-window to avoid compatibility issues
// We can add it back later once we ensure all dependencies work correctly

interface VirtualizedQuestionListProps {
  questions: Question[];
  onUpdate: (index: number, field: keyof Question, value: any) => void;
  onDelete: (index: number) => void;
  onDuplicate: (index: number) => void;
  SortableQuestion: React.ComponentType<{
    question: Question;
    index: number;
    onUpdate: (index: number, field: keyof Question, value: any) => void;
    onDelete: (index: number) => void;
    onDuplicate: (index: number) => void;
  }>;
}

// Simplified version without react-window for now

const VirtualizedQuestionList: React.FC<VirtualizedQuestionListProps> = ({
  questions,
  onUpdate,
  onDelete,
  onDuplicate,
  SortableQuestion,
}) => {
  // For now, render all questions without virtualization
  // This prevents the react-window compatibility issues
  // We can optimize this later with proper virtualization
  
  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 question-list-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
      {questions.map((question, index) => (
        <SortableQuestion
          key={question.id}
          question={question}
          index={index}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
        />
      ))}
    </div>
  );
};

export default React.memo(VirtualizedQuestionList);
