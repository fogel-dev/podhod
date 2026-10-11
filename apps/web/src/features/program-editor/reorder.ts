import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';

type Entry = { id: string; top: number; height: number };
type Drag = {
  id: string;
  pointerId: number;
  from: number;
  to: number;
  startX: number;
  startY: number;
  scroll: number;
  x: number;
  y: number;
  entries: Entry[];
};

export function useExerciseReorder(onMove: (from: number, to: number) => void) {
  const list = useRef<HTMLDivElement>(null);
  const current = useRef<Drag | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function update(x: number, y: number) {
    const value = current.current;
    if (!value) return;
    const offset = y - value.startY + window.scrollY - value.scroll;
    const active = value.entries[value.from]!;
    const center = active.top + active.height / 2 + offset;
    const to = value.entries.filter(
      (entry) => entry.id !== value.id && center > entry.top + entry.height / 2,
    ).length;
    current.current = { ...value, to, x, y };
    setDrag(current.current);
  }
  function scroll() {
    const value = current.current;
    if (!value) return;
    const edge = 90;
    const bottom = window.innerHeight - 110;
    const speed =
      value.y < edge
        ? -Math.min(14, (edge - value.y) / 5)
        : value.y > bottom
          ? Math.min(14, (value.y - bottom) / 5)
          : 0;
    if (speed) window.scrollBy(0, speed);
    update(value.x, value.y);
    frame.current = requestAnimationFrame(scroll);
  }
  function start(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (event.button !== 0 || current.current) return;
    const entries = Array.from(
      list.current?.querySelectorAll<HTMLElement>('[data-exercise-id]') ?? [],
    ).map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        id: node.dataset.exerciseId!,
        top: rect.top + window.scrollY,
        height: rect.height,
      };
    });
    const from = entries.findIndex((entry) => entry.id === id);
    if (from < 0 || entries.length < 2) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    current.current = {
      id,
      pointerId: event.pointerId,
      from,
      to: from,
      startX: event.clientX,
      startY: event.clientY,
      scroll: window.scrollY,
      x: event.clientX,
      y: event.clientY,
      entries,
    };
    setDrag(current.current);
    frame.current = requestAnimationFrame(scroll);
  }
  function finish(cancel = false) {
    const value = current.current;
    current.current = null;
    cancelAnimationFrame(frame.current);
    setDrag(null);
    if (!cancel && value && value.from !== value.to)
      onMove(value.from, value.to);
  }
  function style(id: string, index: number): CSSProperties | undefined {
    if (!drag) return undefined;
    const active = drag.entries[drag.from]!;
    if (id === drag.id)
      return {
        transform: `translate(${Math.max(-12, Math.min(12, drag.x - drag.startX))}px, ${drag.y - drag.startY + window.scrollY - drag.scroll}px)`,
        zIndex: 3,
        transition: 'none',
      };
    const gap =
      drag.entries[1]!.top - drag.entries[0]!.top - drag.entries[0]!.height;
    const offset =
      drag.to > drag.from && index > drag.from && index <= drag.to
        ? -active.height - gap
        : drag.to < drag.from && index >= drag.to && index < drag.from
          ? active.height + gap
          : 0;
    return { transform: `translateY(${offset}px)` };
  }
  return {
    list,
    drag,
    start,
    move: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.pointerId === current.current?.pointerId)
        update(event.clientX, event.clientY);
    },
    finish,
    style,
  };
}
