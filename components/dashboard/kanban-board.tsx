"use client";

import { useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GuestRequestType, requestTypeLabels } from "@/lib/guest-requests";
import { formatDistanceToNow } from "date-fns";
import { assignGuestRequest, resolveGuestRequest } from "@/app/dashboard/actions";

type RequestStatus = "open" | "in_progress" | "resolved";

interface KanbanItem {
  id: string;
  unit: string;
  type: GuestRequestType;
  status: RequestStatus;
  createdAt: string;
  assignedTo?: string | null;
  issue?: string | null;
}

const statusConfig = {
  open: {
    label: "Pending",
    color: "bg-amber-500",
    lightColor: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-blue-500",
    lightColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
  },
  resolved: {
    label: "Resolved",
    color: "bg-green-500",
    lightColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200",
  },
};

export function KanbanBoard({ initialRequests }: { initialRequests: KanbanItem[] }) {
  const [items, setItems] = useState(initialRequests);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const id = active.id as string;
    const newStatus = over.id as RequestStatus;
    const currentItem = items.find((i) => i.id === id);

    if (!currentItem || currentItem.status === newStatus) return;
    
    // Status Lock: resolved -> * is forbidden
    if (currentItem.status === "resolved") return;

    // Optimistic Update
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: newStatus } : item
      )
    );

    try {
      const res = await fetch(`/api/requests/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ status: newStatus }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to update status");
    } catch (error) {
      console.error(error);
      // Rollback
      setItems(initialRequests);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mt-8">
        {(["open", "in_progress", "resolved"] as RequestStatus[]).map((status) => (
          <KanbanColumn
            key={status}
            id={status}
            title={statusConfig[status].label}
            count={items.filter((i) => i.status === status).length}
            items={items.filter((i) => i.status === status)}
          />
        ))}
      </div>
    </DndContext>
  );
}

function KanbanColumn({ id, title, count, items }: { id: RequestStatus; title: string; count: number; items: KanbanItem[] }) {
  const { setNodeRef } = useDroppable({ id });
  const config = statusConfig[id];

  return (
    <div
      ref={setNodeRef}
      className="glass-panel min-h-[500px] flex flex-col gap-4 rounded-[28px] p-5 bg-white/40"
    >
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${config.color} shadow-[0_0_8px_rgba(0,0,0,0.1)]`}></span>
          <h3 className="font-display text-xl text-navy">{title}</h3>
        </div>
        <span className="rounded-full bg-white/60 px-2.5 py-0.5 text-xs font-bold text-navy luxury-ring">
          {count}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <KanbanCard key={item.id} item={item} />
        ))}
        {items.length === 0 && (
          <div className="flex items-center justify-center py-10 text-xs italic text-muted/60">
            No requests here
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({ item }: { item: KanbanItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });
  const config = statusConfig[item.status];

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group relative rounded-2xl border ${config.borderColor} ${isDragging ? 'shadow-xl' : 'shadow-sm'} bg-white p-4 transition-all hover:shadow-md cursor-grab active:cursor-grabbing`}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="font-bold text-navy">{item.unit}</p>
        <span className="text-[10px] font-medium text-muted">
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </span>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <span className={`rounded-full ${config.lightColor} ${config.textColor} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider`}>
          {requestTypeLabels[item.type]}
        </span>
        {item.assignedTo && (
          <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] font-medium italic">
            Assigned
          </span>
        )}
      </div>

      {item.issue && (
        <p className="text-xs text-muted mb-3 line-clamp-2 italic">
          &ldquo;{item.issue}&rdquo;
        </p>
      )}

      {/* Quick Actions (Fallback for Drag) */}
      <div className="mt-4 flex gap-2 pt-3 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
        {item.status === "open" && (
          <button
            onPointerDown={(e) => e.stopPropagation()} // Prevent drag when clicking button
            onClick={async () => {
              if (confirm("Assign this request to you?")) {
                await assignGuestRequest(item.id);
              }
            }}
            className="flex-1 rounded-lg bg-blue-50 py-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition"
          >
            Assign to me
          </button>
        )}
        {(item.status === "open" || item.status === "in_progress") && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={async () => {
              if (confirm("Mark as resolved?")) {
                await resolveGuestRequest(item.id);
              }
            }}
            className="flex-1 rounded-lg bg-green-50 py-1.5 text-[10px] font-bold text-green-600 hover:bg-green-100 transition"
          >
            Resolve
          </button>
        )}
      </div>
    </div>
  );
}
