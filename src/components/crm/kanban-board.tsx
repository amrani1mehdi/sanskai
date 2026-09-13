"use client";

/**
 * The board — one column per stage, cards dragged between them.
 *
 * Presentational: the workspace above owns the leads, the filters and the
 * selection, so the board can be pointed at service dossiers or contact
 * messages without knowing the difference. `stages` is what makes that work —
 * a message has two, a dossier has six.
 *
 * Drag and drop uses the native HTML5 API rather than a library: one drop
 * target type, no reordering inside a column, which the browser handles alone.
 *
 * Each column is a tray: a flat tint the cards sit on. It started without one,
 * on the theory that a rule and a gap were separation enough, but white cards
 * on a #fafafa canvas are two per cent apart and read as text loose on the
 * page. The tray also gives the drag somewhere to signal — a drop target one
 * shade off the background is not a signal.
 */

import { Paperclip, Plus, StickyNote } from "lucide-react";
import { PrestationChip } from "@/components/crm/prestation-chip";
import { SERVICE_BY_ID, type StageConfig } from "@/lib/crm/config";
import { formatAmount, formatShortDate, formatTime } from "@/lib/crm/format";
import type { Lead, LeadStatus } from "@/lib/crm/types";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";

export function KanbanBoard({
  leads,
  stages,
  selectedId,
  onSelect,
  onMove,
  onAdd,
}: {
  leads: Lead[];
  stages: StageConfig[];
  selectedId: string | null;
  onSelect: (lead: Lead, focus?: "documents") => void;
  onMove: (id: string, status: LeadStatus) => void;
  /** Opens the new-lead form, starting in this column. */
  onAdd: (stage: StageConfig) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<LeadStatus | null>(null);
  /* The card that just landed, so it can flash once in its new column. Cleared
     on a timer rather than on animation end: the element is remounted into a
     different column by the move, and the event would be lost with it. */
  const [landed, setLanded] = useState<string | null>(null);

  useEffect(() => {
    if (!landed) return;
    const timer = setTimeout(() => setLanded(null), 900);
    return () => clearTimeout(timer);
  }, [landed]);

  const byStage = useMemo(() => {
    const grouped = new Map<LeadStatus, Lead[]>(
      stages.map((stage) => [stage.id, [] as Lead[]]),
    );

    for (const lead of leads) grouped.get(lead.status)?.push(lead);

    for (const list of grouped.values()) {
      list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }

    return grouped;
  }, [leads, stages]);

  /* How many steps the pipeline has, ignoring the exits — the denominator for
     the column heads' "02/04". */
  const steps = stages.filter((stage) => stage.step !== null).length;

  /**
   * Which card is being dragged.
   *
   * The id travels on the drag itself as well as in state, and the payload is
   * trusted first. State is set in `dragstart` and read in `drop`, which is two
   * renders apart and fine in practice — but the payload is what the browser
   * actually carried from one to the other, so it cannot be stale, and it is
   * what makes a drop work when the two disagree.
   */
  const dropped = (event: React.DragEvent, status: LeadStatus) => {
    // Without this the browser takes the drop back and treats it as navigation.
    event.preventDefault();

    const id = event.dataTransfer.getData("text/plain") || dragging;

    if (id) {
      onMove(id, status);
      setLanded(id);
    }

    setDragging(null);
    setOver(null);
  };

  return (
    <div className="h-full overflow-x-auto pb-2 scrollbar-brand">
      {/* The columns share the width rather than being cut to a fixed one.
          Six at 16rem left a strip of empty canvas down the right on a wide
          screen; `flex-1` spends it on the cards instead. The min-width is what
          keeps that from becoming six unreadable slivers on a laptop — below
          it the row overflows and scrolls, as it did before. */}
      <div className="flex h-full gap-4">
        {stages.map((stage) => {
          const list = byStage.get(stage.id) ?? [];
          const active = over === stage.id;

          return (
            <section
              key={stage.id}
              /*
               * A drop target has to refuse the browser's default on *both*
               * `dragenter` and `dragover`. Only `dragover` was cancelled, so
               * the column lit up, accepted the pointer, and then dropped
               * nothing: the sequence ran dragenter, dragover, dragend, with no
               * drop in it at all.
               */
              onDragEnter={(event) => {
                event.preventDefault();
                setOver(stage.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setOver(stage.id);
              }}
              /*
               * `dragleave` fires every time the pointer crosses from the
               * column into one of its own children — a card, the tray, the
               * button — so clearing on it unconditionally made the highlight
               * blink off and on as you moved, which is the flicker that made
               * the cards look like they were dancing. `relatedTarget` is where
               * the pointer went; if it is still inside this column, nothing
               * has been left.
               */
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node)) {
                  return;
                }
                setOver((current) => (current === stage.id ? null : current));
              }}
              onDrop={(event) => dropped(event, stage.id)}
              className="flex h-full min-w-60 flex-1 flex-col"
            >
              <ColumnHead
                stage={stage}
                steps={steps}
                count={list.length}
                active={active}
              />

              {/*
               * The column has a fill of its own, and the drop target has a
               * much stronger one.
               *
               * Cards are white; on a #fafafa canvas with nothing behind them
               * they were two per cent apart and read as text floating on the
               * page. The tray gives them something to sit on, and doubles as
               * the surface that can visibly darken when a card is over it —
               * a drop target one shade off the background is not a signal.
               *
               * Each column scrolls on its own, so the heads stay in view and
               * you can always see which stage you are dropping into.
               */}
              <div
                className={cn(
                  "min-h-24 flex-1 space-y-2.5 overflow-y-auto p-2 transition-colors duration-150 scrollbar-brand",
                  active
                    ? "bg-foreground/[0.10] outline-2 outline-dashed outline-foreground/40 -outline-offset-2"
                    : "bg-foreground/[0.04]",
                )}
              >
                {/*
                 * No placeholder slot here.
                 *
                 * One used to open at the top of the column being dragged over.
                 * It shifted every card in that column down by its own height —
                 * which moved the card under the pointer, fired another
                 * dragleave, closed the slot, moved them back, and so on. The
                 * cards jittered under the cursor for as long as you hovered.
                 *
                 * The tray's fill and dashed outline say the same thing without
                 * touching the layout, so the column stays still while you aim
                 * at it.
                 */}
                {list.map((lead) => (
                  <KanbanCard
                    key={lead.id}
                    lead={lead}
                    dragging={dragging === lead.id}
                    landed={landed === lead.id}
                    accent={stage.accent}
                    selected={selectedId === lead.id}
                    awaiting={
                      lead.status === "nouveau" && lead.contactedAt === null
                    }
                    onSelect={(focus) => onSelect(lead, focus)}
                    onDragStart={() => setDragging(lead.id)}
                    onDragEnd={() => {
                      setDragging(null);
                      setOver(null);
                    }}
                  />
                ))}

                {list.length === 0 && !active ? (
                  <p className="border border-dashed border-border px-3 py-6 text-center font-mono text-[11px] text-muted-foreground">
                    — vide —
                  </p>
                ) : null}

                {/* Enquiries also arrive by phone. Per column rather than once
                    on the toolbar, so where you add it is also what stage it
                    starts at — a lead taken over the phone and already agreed
                    does not have to be dragged four columns after typing it. */}
                <button
                  type="button"
                  onClick={() => onAdd(stage)}
                  className="flex w-full items-center justify-center gap-1.5 bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  <Plus size={14} aria-hidden />
                  Ajouter un lead
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The column head, and the one place the board's shape is drawn.
 *
 * Under each label is a 2px rule. For a working stage it fills left to right in
 * proportion to how far along the pipeline that stage is — a quarter at step
 * one, full at step four — so the row of heads reads as a progression at a
 * glance. The two exits have no place in that sequence, so they fill it
 * completely instead: the line runs, then it stops, one way or the other.
 *
 * The head is a solid block of the stage's colour rather than a label with a
 * rule under it. Six labels in the same ink, three words apart, were a row you
 * had to read to navigate; six blocks are a row you recognise.
 */
function ColumnHead({
  stage,
  steps,
  count,
  active,
}: {
  stage: StageConfig;
  steps: number;
  count: number;
  active: boolean;
}) {
  const terminal = stage.step === null;

  return (
    <header
      className={cn(
        "relative shrink-0 overflow-hidden px-3 pt-2.5 pb-3 transition-all duration-150",
        stage.accent,
        active && "outline-2 outline-dashed outline-foreground -outline-offset-2",
      )}
    >
      <div className="flex items-baseline gap-2">
        <h2 className="font-display text-[13px] font-bold tracking-[0.1em] text-white uppercase">
          {stage.label}
        </h2>
        {/* On its own ground rather than loose in the bar: the count is the one
            number here and it should not read as part of the title. */}
        <span className="ml-auto bg-black/20 px-1.5 py-0.5 font-mono text-xs font-semibold text-white tabular-nums">
          {count}
        </span>
      </div>

      <p className="mt-1 flex items-baseline gap-1.5 text-[11px] text-white/75">
        {terminal ? null : (
          <span className="font-mono tabular-nums">
            {String(stage.step).padStart(2, "0")}/{String(steps).padStart(2, "0")}
          </span>
        )}
        <span className="truncate">{stage.hint}</span>
      </p>

      {/*
       * The progression, now drawn inside the block.
       *
       * It used to be a rule under a plain header, which meant the colour said
       * the stage twice — once as a bar, once as the head's own tint. Inside,
       * on a darkened track, it is the same information without the second
       * copy: a quarter filled at step one, whole at step four, and whole for
       * the two exits, which are not steps but ends.
       */}
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/25">
        <div
          className="h-full bg-white/80"
          style={{
            width: terminal ? "100%" : `${((stage.step ?? 0) / steps) * 100}%`,
          }}
        />
      </div>
    </header>
  );
}

function KanbanCard({
  lead,
  dragging,
  landed,
  accent,
  selected,
  awaiting,
  onSelect,
  onDragStart,
  onDragEnd,
}: {
  lead: Lead;
  dragging: boolean;
  /** Just dropped here — flashes once, then settles. */
  landed: boolean;
  /** The stage colour, for the edge down the left. */
  accent: string;
  selected: boolean;
  /**
   * Sitting in "Nouveau" with nobody having rung them yet.
   *
   * Both halves matter. Moving a lead out of Nouveau is someone taking it on,
   * and marking it contacted is someone ringing it — either one means it is no
   * longer waiting, so either one turns the card white.
   */
  awaiting: boolean;
  onSelect: (focus?: "documents") => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    /*
     * The card is the drag handle and the click target, both.
     *
     * It used to carry a full-bleed `<button>` on top of it for selection. That
     * button was also, unavoidably, what every mousedown landed on — and a
     * press-and-drag beginning on an interactive control does not start the
     * draggable ancestor's drag, so the board could be clicked but barely
     * dragged. The roles are on the article now: one element you press, one
     * element you drag, and no way for them to disagree.
     *
     * `select-none` because the alternative gesture on a card full of text is
     * selecting the text, and that is never what dragging a card means here.
     */
    <article
      draggable
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`Voir ${lead.prenom} ${lead.nom}, ${lead.reference}`}
      onClick={() => onSelect()}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        // Space scrolls the column otherwise, which is the one thing you do not
        // want when you meant to open the card under the cursor.
        event.preventDefault();
        onSelect();
      }}
      onDragStart={(event) => {
        /*
         * The id rides on the drag, not only in React state.
         *
         * Firefox refuses to start a drag at all unless `setData` is called,
         * so this is what makes the board draggable there rather than a nicety
         * — and it gives the drop something authoritative to read.
         */
        event.dataTransfer.setData("text/plain", lead.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground active:cursor-grabbing",
        /* Transform as well as colour: the card being dragged tilts and shrinks
           slightly, so the one under the cursor is obviously the one in hand
           and not just a dimmed copy. `motion-reduce` drops the movement and
           leaves the fade, which says the same thing more quietly. */
        "relative border transition-[transform,opacity,border-color,background-color,box-shadow] duration-200",
        dragging &&
          "scale-[0.97] opacity-45 shadow-[0_10px_24px_-14px_rgba(24,24,27,0.5)] rotate-[-0.6deg] motion-reduce:rotate-0 motion-reduce:scale-100",
        landed && "crm-landed",
        /*
         * Three states, in this order of precedence.
         *
         * Open in the panel wins: while you are reading one lead, which card it
         * is matters more than anything the card would otherwise say, and its
         * other state is right there in the panel anyway.
         *
         * Then "waiting" — amber, and only in the first column. Amber answers
         * one question, "who has nobody dealt with yet", so it has to stop the
         * moment someone does: dragging the card onward is that, and so is
         * marking it contacted without moving it. Opening it is not, which is
         * why the tint survives a read.
         *
         * Otherwise white, and in hand.
         */
        selected
          ? "border-open bg-open-soft ring-1 ring-open"
          : awaiting
            ? "border-new/60 bg-new-soft hover:border-new"
            : "border-border bg-card hover:border-muted-foreground",
      )}
    >
      {/*
       * The edge down the left, and what it says.
       *
       * Its colour is the card's state where it has one — cyan while open,
       * amber while waiting — and otherwise the stage's own, so a card carries
       * which column it belongs to even once it is out of that column: dragged
       * across the board, or read in the panel beside it. It is also what keeps
       * the two coloured states apart for anyone who cannot separate the fills.
       */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 left-0 w-[3px]",
          selected ? "bg-open" : awaiting ? "bg-new" : accent,
        )}
      />

      {/*
       * No overlay here any more — see the card element itself.
       */}
      <div className="relative px-3 pt-3 pb-2.5">
        <div className="flex items-baseline justify-between gap-2">
          {/* The reference is the lead's name in every other system — the
              subject line of the email, the row in the ledger — so it is set
              in the same face those are read in. */}
          <span className="font-mono text-xs font-semibold text-foreground">
            {lead.reference}
          </span>
          <span className="font-mono text-[11px] whitespace-nowrap text-muted-foreground tabular-nums">
            {formatShortDate(lead.createdAt)} · {formatTime(lead.createdAt)}
          </span>
        </div>

        <p className="mt-2 truncate text-[15px] font-semibold text-foreground">
          {lead.prenom} {lead.nom}
        </p>
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{lead.entreprise}</p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
            {SERVICE_BY_ID[lead.service].shortLabel}
          </span>
          {lead.prestation ? (
            <PrestationChip prestation={lead.prestation} short />
          ) : null}
        </div>

        {/* The amount is the first thing read off a funding request. A salon
            sheet carries one only when financing was among its needs. */}
        {lead.service === "financement" || (lead.service === "salon" && lead.montant) ? (
          <p className="mt-2.5 font-mono text-[17px] font-semibold text-foreground tabular-nums">
            {formatAmount(lead.montant)}
          </p>
        ) : null}
      </div>

      {/* Only when it has something to say. With the call and email shortcuts
          gone, a card with no pieces and no notes was left with an empty ruled
          strip along its bottom. */}
      <div
        className={cn(
          "relative items-center gap-1 border-t border-border px-2 py-1.5 font-mono text-xs text-muted-foreground",
          lead.documentCount > 0 || lead.noteCount > 0 ? "flex" : "hidden",
        )}
      >
        {lead.documentCount > 0 ? (
          /* Straight to the pieces. Everywhere else on the card selects the
             lead; this selects it *and* opens its documents, because a
             paperclip with a number on it is a thing you expect to click. */
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onSelect("documents");
            }}
            title={`Consulter les ${lead.documentCount} pièce${
              lead.documentCount > 1 ? "s" : ""
            } de ${lead.reference}`}
            aria-label={`Consulter les pièces jointes de ${lead.reference}`}
            className="inline-flex items-center gap-1 px-1.5 py-1 transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Paperclip size={11} aria-hidden />
            {lead.documentCount}
          </button>
        ) : null}

        {lead.noteCount > 0 ? (
          <span className="inline-flex items-center gap-1 px-1.5 py-1">
            <StickyNote size={11} aria-hidden />
            {lead.noteCount}
          </span>
        ) : null}

      </div>
    </article>
  );
}

