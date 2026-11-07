"use client";
import {
  type CollisionDetection,
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type KeyboardCoordinateGetter,
  KeyboardSensor,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Lock,
  MessageSquare,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { compareCards, placeCard } from "@/lib/card-order";
import {
  type Card,
  descriptions,
  labels,
  type Status,
  statuses,
} from "@/lib/model";
import { Github } from "./github-icon";

type Changes = { status?: Status; position?: number };
type Props = {
  cards: Card[];
  visibleIds: Set<string>;
  pending: Set<string>;
  disabled: boolean;
  onOpen: (id: string) => void;
  onSave: (card: Card, changes: Changes) => Promise<Card>;
};
const collision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const cards = hits.filter((hit) => !String(hit.id).startsWith("column:"));
  if (args.pointerCoordinates) return cards.length ? cards : hits;
  return closestCenter(args);
};

function CardContent({ card, onOpen }: { card: Card; onOpen?: () => void }) {
  return (
    <button
      type="button"
      className="card-open"
      onClick={onOpen}
      tabIndex={onOpen ? 0 : -1}
      aria-label={`開啟 ${card.fullName}`}
    >
      <div className="card-owner">
        {card.fullName.split("/")[0]}
        {card.isPrivate ? (
          <Lock size={12} aria-label="Private" />
        ) : (
          <Github size={13} />
        )}
      </div>
      <h3>{card.name}</h3>
      <p>{card.description || "尚未提供 repo 描述"}</p>
      {card.notes ? (
        <div className="card-note">
          <MessageSquare size={13} />
          <span>{card.notes}</span>
        </div>
      ) : null}
      <div className="card-meta">
        <span>
          <i />
          {card.language ?? "未分類"}
        </span>
        <span className="card-source">
          {card.source === "auto" ? "建議分類" : "已整理"}
        </span>
      </div>
    </button>
  );
}
function SortableCard({
  card,
  pending,
  disabled,
  reducedMotion,
  onOpen,
  onSave,
}: {
  card: Card;
  pending: boolean;
  disabled: boolean;
  reducedMotion: boolean;
  onOpen: () => void;
  onSave: (status: Status) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.repoId,
    disabled: pending || disabled,
    transition: reducedMotion
      ? null
      : { duration: 220, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  });
  return (
    <article
      ref={setNodeRef}
      className={`repo-card ${isDragging ? "dragging" : ""} ${pending ? "saving" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="drag-handle"
        {...attributes}
        {...listeners}
        disabled={pending || disabled}
        aria-label={`拖曳 ${card.fullName}`}
        title="拖曳排序；鍵盤按空白鍵拿起，方向鍵移動，空白鍵放下，Esc 取消"
      >
        <GripVertical size={15} />
        <span>{pending ? "儲存中…" : "拖曳移動"}</span>
      </button>
      <CardContent card={card} onOpen={onOpen} />
      <div className="card-status">
        <select
          aria-label={`${card.name} 的狀態`}
          value={card.status}
          disabled={pending || disabled}
          onChange={(e) => {
            const status = statuses.find((item) => item === e.target.value);
            if (status && status !== card.status) onSave(status);
          }}
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {labels[status]}
            </option>
          ))}
        </select>
        <span title={card.reason}>ⓘ</span>
      </div>
    </article>
  );
}
function Column({
  status,
  count,
  collapsed,
  over,
  toggle,
  children,
}: {
  status: Status;
  count: number;
  collapsed: boolean;
  over: boolean;
  toggle: () => void;
  children: ReactNode;
}) {
  const { setNodeRef } = useDroppable({ id: `column:${status}` });
  return (
    <section
      ref={setNodeRef}
      className={`column ${status === "legacy" ? "legacy-column" : ""} ${collapsed ? "collapsed" : ""} ${over ? "drop-target" : ""}`}
      aria-label={labels[status]}
    >
      {collapsed ? (
        <button
          type="button"
          className="legacy-rail"
          aria-label={`展開 Legacy，${count} 個 repo`}
          aria-expanded={false}
          onClick={toggle}
        >
          <ChevronRight size={17} />
          <span className="rail-title">Legacy</span>
          <span className="rail-count">{count}</span>
        </button>
      ) : (
        <>
          <div className="column-header">
            <div>
              <i className={`status-dot ${status}`} />
              <h2>{labels[status]}</h2>
              <span>{count}</span>
            </div>
            {status === "legacy" ? (
              <button
                type="button"
                className="icon-button"
                aria-label="收合 Legacy"
                aria-expanded={true}
                onClick={toggle}
              >
                <ChevronLeft size={16} />
              </button>
            ) : status === "archive" ? (
              <Archive size={15} />
            ) : null}
          </div>
          <p className="column-caption">{descriptions[status]}</p>
          <div className="card-stack">
            {children}
            {count === 0 ? (
              <div className="empty-column">拖曳 repo 到這裡</div>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
export function KanbanBoard({
  cards,
  visibleIds,
  pending,
  disabled,
  onOpen,
  onSave,
}: Props) {
  const [legacyOpen, setLegacyOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<Status | null>(null);
  const [draft, setDraft] = useState<Card[] | null>(null);
  const draftRef = useRef<Card[] | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const keyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
    if (event.code !== "ArrowLeft" && event.code !== "ArrowRight")
      return sortableKeyboardCoordinates(event, args);
    event.preventDefault();
    const items = draftRef.current ?? cards;
    const current = target(String(args.context.over?.id ?? args.active), items);
    const index = current ? statuses.indexOf(current) : -1;
    const next = statuses[index + (event.code === "ArrowRight" ? 1 : -1)];
    const rect = next
      ? args.context.droppableRects.get(`column:${next}`)
      : undefined;
    const activeRect = args.context.collisionRect;
    if (rect && activeRect)
      return {
        x: rect.left + (rect.width - activeRect.width) / 2,
        y: rect.top + (rect.height - activeRect.height) / 2,
      };
  };
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardCoordinates,
    }),
  );
  const display = draft ?? cards;
  const active = display.find((card) => card.repoId === activeId);
  function target(id: string, items: Card[]): Status | undefined {
    return id.startsWith("column:")
      ? statuses.find((status) => id === `column:${status}`)
      : items.find((card) => card.repoId === id)?.status;
  }
  function preview(event: DragOverEvent) {
    if (!event.over) {
      setOverStatus(null);
      return;
    }
    const items = draftRef.current ?? cards;
    const status = target(String(event.over.id), items);
    setOverStatus(status ?? null);
    if (status === "legacy") setLegacyOpen(true);
    const card = items.find((item) => item.repoId === String(event.active.id));
    if (!card || !status || card.status === status) return;
    const change = placeCard(items, card.repoId, status, String(event.over.id));
    const next = items.map((item) =>
      item.repoId === card.repoId ? { ...item, ...change } : item,
    );
    draftRef.current = next;
    setDraft(next);
  }
  function reset() {
    setActiveId(null);
    setOverStatus(null);
    setDraft(null);
    draftRef.current = null;
  }
  function drop(event: DragEndEvent) {
    const original = cards.find(
      (card) => card.repoId === String(event.active.id),
    );
    const items = draftRef.current ?? cards;
    const current = items.find(
      (card) => card.repoId === String(event.active.id),
    );
    const status = event.over
      ? target(String(event.over.id), items)
      : undefined;
    if (original && current && status && event.over) {
      const overId = String(event.over.id);
      const translated = event.active.rect.current.translated;
      const peers = cards
        .filter((card) => card.status === status)
        .sort(compareCards);
      const after =
        original.status === status && current.status === status
          ? peers.findIndex((card) => card.repoId === original.repoId) <
            peers.findIndex((card) => card.repoId === overId)
          : translated
            ? translated.top + translated.height / 2 >
              event.over.rect.top + event.over.rect.height / 2
            : false;
      const changes =
        overId === original.repoId
          ? { status, position: current.position }
          : placeCard(items, original.repoId, status, overId, after);
      if (
        changes.status !== original.status ||
        changes.position !== original.position
      )
        void onSave(original, changes).catch(() => {});
    }
    reset();
  }
  return (
    <DndContext
      id="repository-board"
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={({ active }) => {
        setActiveId(String(active.id));
        draftRef.current = cards;
        setDraft(cards);
      }}
      onDragOver={preview}
      onDragCancel={reset}
      onDragEnd={drop}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "按空白鍵拿起卡片，以方向鍵移動，再按空白鍵放下，或按 Esc 取消。",
        },
        announcements: {
          onDragStart: ({ active }) =>
            `已拿起 ${cards.find((card) => card.repoId === active.id)?.name ?? "卡片"}`,
          onDragOver: ({ over }) =>
            over
              ? `移動到 ${labels[target(String(over.id), draftRef.current ?? cards) ?? "backlog"]}`
              : "目前不在可放置區域",
          onDragEnd: ({ over }) =>
            over ? "已放下卡片，正在儲存" : "已取消移動",
          onDragCancel: () => "已取消移動",
        },
      }}
    >
      <section
        className={`kanban ${legacyOpen ? "legacy-expanded" : ""} ${activeId ? "is-dragging" : ""}`}
        aria-label="Repository 看板"
      >
        {statuses.map((status) => {
          const columnCards = display
            .filter(
              (card) => card.status === status && visibleIds.has(card.repoId),
            )
            .sort(compareCards);
          return (
            <Column
              key={status}
              status={status}
              count={columnCards.length}
              collapsed={status === "legacy" && !legacyOpen}
              toggle={() => setLegacyOpen((open) => !open)}
              over={activeId !== null && status === overStatus}
            >
              <SortableContext
                items={columnCards.map((card) => card.repoId)}
                strategy={verticalListSortingStrategy}
              >
                {columnCards.map((card) => (
                  <SortableCard
                    key={card.repoId}
                    card={card}
                    pending={pending.has(card.repoId)}
                    disabled={disabled}
                    reducedMotion={reducedMotion}
                    onOpen={() => onOpen(card.repoId)}
                    onSave={(status) => {
                      void onSave(
                        card,
                        placeCard(cards, card.repoId, status, null),
                      ).catch(() => {});
                    }}
                  />
                ))}
              </SortableContext>
            </Column>
          );
        })}
      </section>
      <DragOverlay
        dropAnimation={
          reducedMotion
            ? null
            : { duration: 240, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
        }
      >
        {active ? (
          <article className="repo-card drag-overlay">
            <div className="drag-handle">
              <GripVertical size={15} />
              <span>移動中</span>
            </div>
            <CardContent card={active} />
            <div className="overlay-status">{labels[active.status]}</div>
          </article>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
