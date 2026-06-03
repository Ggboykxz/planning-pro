"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

// Draggable slot component - wraps filled timetable cells
interface DraggableSlotProps {
  id: string;
  data: {
    slotId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  };
  children: React.ReactNode;
  isDragging?: boolean;
}

export function DraggableSlot({ id, data, children, isDragging }: DraggableSlotProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isActiveDragging } = useDraggable({
    id,
    data,
  });

  const style: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "transition-opacity duration-150",
        isActiveDragging && "opacity-40 cursor-grabbing",
        !isActiveDragging && "cursor-grab"
      )}
    >
      {children}
    </div>
  );
}

// Droppable cell component - wraps empty timetable cells
interface DroppableCellProps {
  id: string;
  data: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  };
  children: React.ReactNode;
  isOver?: boolean;
  onClick?: () => void;
}

export function DroppableCell({ id, data, children, isOver, onClick }: DroppableCellProps) {
  const { setNodeRef, isOver: isActiveOver } = useDroppable({
    id,
    data,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "h-full min-h-[60px] transition-colors duration-150",
        onClick && "cursor-pointer hover:bg-[#201D1D]/[0.03] dark:hover:bg-[#FDFCFC]/[0.03]",
        isActiveOver && "bg-[#201D1D]/5 dark:bg-[#FDFCFC]/5 ring-1 ring-inset ring-[#201D1D]/20 dark:ring-[#FDFCFC]/20"
      )}
    >
      {children}
    </div>
  );
}

// Drag overlay content - shows the slot being dragged
interface DragOverlayContentProps {
  slot: {
    subject: { name: string; type: string | null } | null;
    teacher: { firstName: string; lastName: string } | null;
    room: { name: string } | null;
  };
  bgColor?: string;
  textColor?: string;
}

export function DragOverlayContent({ slot, bgColor, textColor }: DragOverlayContentProps) {
  return (
    <div
      style={{
        backgroundColor: bgColor || undefined,
        borderLeftColor: textColor || undefined,
        color: textColor || undefined,
      }}
      className={cn(
        "border-l-[3px] p-2 min-h-[60px] min-w-[120px]",
        "shadow-lg opacity-90 border border-[#201D1D]/10 dark:border-[#FDFCFC]/10"
      )}
    >
      {slot.subject && (
        <p className="text-xs font-bold truncate">
          {slot.subject.name}
        </p>
      )}
      {slot.subject?.type && (
        <span className="text-[9px] opacity-70 uppercase">{slot.subject.type}</span>
      )}
      <div className="mt-1">
        {slot.teacher && (
          <p className="text-[10px] opacity-70 truncate">
            {slot.teacher.firstName.charAt(0)}. {slot.teacher.lastName}
          </p>
        )}
        {slot.room && (
          <p className="text-[10px] opacity-70 truncate">
            {slot.room.name}
          </p>
        )}
      </div>
    </div>
  );
}
