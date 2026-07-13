"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

const EMOTIONS = [
  { value: "love", emoji: "😍", label: "Love" },
  { value: "good", emoji: "😄", label: "Good" },
  { value: "wow", emoji: "😮", label: "Wow" },
  { value: "sad", emoji: "😢", label: "Sad" },
  { value: "angry", emoji: "😡", label: "Angry" },
  { value: "funny", emoji: "😂", label: "Funny" },
];

interface VotingComponentProps {
  vote: string | null;
  rating: number | null;
  onVoteChange: (vote: string | null) => void;
  onRatingChange: (rating: number | null) => void;
  isActionInProgress?: boolean;
  label?: string;
}

export function VotingComponent({
  vote,
  rating,
  onVoteChange,
  onRatingChange,
  isActionInProgress = false,
  label = "Item",
}: VotingComponentProps) {
  const [showDrawer, setShowDrawer] = useState(false);
  const [showDesktopPopover, setShowDesktopPopover] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top - 12,
        left: rect.right - 290,
      });
    }
  };

  useEffect(() => {
    if (showDesktopPopover) {
      updateCoords();
      window.addEventListener("scroll", updateCoords, true);
      window.addEventListener("resize", updateCoords);
    }
    return () => {
      window.removeEventListener("scroll", updateCoords, true);
      window.removeEventListener("resize", updateCoords);
    };
  }, [showDesktopPopover]);

  // Close desktop popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        const target = event.target as HTMLElement;
        if (!target.closest(".portal-popover")) {
          setShowDesktopPopover(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeEmotion = EMOTIONS.find((e) => e.value === vote);

  // Trigger modal sheet for mobile, or popover inline for desktop
  const handleOpen = () => {
    if (window.innerWidth < 768) {
      setShowDrawer(true);
    } else {
      setShowDesktopPopover(!showDesktopPopover);
    }
  };

  const clearAllRatings = () => {
    onVoteChange(null);
    onRatingChange(null);
    setShowDrawer(false);
    setShowDesktopPopover(false);
  };

  const PickerContent = () => (
    <div className="flex flex-col gap-4 text-white">
      {/* Reactions Section */}
      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-left">
          Reaction
        </div>
        <div className="grid grid-cols-6 gap-2">
          {EMOTIONS.map((emotion) => {
            const isSelected = vote === emotion.value;
            return (
              <button
                key={emotion.value}
                onClick={(e) => {
                  e.stopPropagation();
                  onVoteChange(isSelected ? null : emotion.value);
                  if (window.innerWidth >= 768) setShowDesktopPopover(false);
                }}
                title={emotion.label}
                className={`flex h-11 w-11 items-center justify-center rounded-2xl text-2xl transition-all duration-200 hover:scale-125 cursor-pointer touch-manipulation ${
                  isSelected
                    ? "bg-yellow-400/25 border-2 border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.3)]"
                    : "bg-white/5 border border-transparent hover:bg-white/10"
                }`}
              >
                {emotion.emoji}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ratings Section */}
      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-left">
          Score Rating
        </div>
        <div className="grid grid-cols-5 gap-2">
          {[...Array(10)].map((_, i) => {
            const val = i + 1;
            const isSelected = rating === val;
            return (
              <button
                key={val}
                onClick={(e) => {
                  e.stopPropagation();
                  onRatingChange(val);
                  if (window.innerWidth >= 768) setShowDesktopPopover(false);
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold cursor-pointer transition-all duration-150 touch-manipulation ${
                  isSelected
                    ? "bg-amber-500 text-black font-extrabold shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                    : "bg-white/5 text-white border border-white/5 hover:bg-white/10 hover:border-white/10"
                }`}
              >
                {val}
              </button>
            );
          })}
        </div>
      </div>

      {(vote !== null || rating !== null) && (
        <button
          onClick={clearAllRatings}
          className="w-full rounded-xl bg-red-500/10 border border-red-500/25 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer touch-manipulation mt-2"
        >
          Remove Reactions & Rating
        </button>
      )}
    </div>
  );

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      {/* Redesigned Integrated Button Pill */}
      <button
        onClick={handleOpen}
        disabled={isActionInProgress}
        className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-300 cursor-pointer touch-manipulation shrink-0 ${
          vote || rating
            ? "border-yellow-400 bg-yellow-400 text-black shadow-[0_0_10px_rgba(250,204,21,0.2)] hover:bg-yellow-500"
            : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span className="flex items-center gap-1">
          {activeEmotion ? (
            <span className="text-sm">{activeEmotion.emoji}</span>
          ) : (
            <span className="material-symbols-outlined text-[16px] leading-none" style={rating ? { fontVariationSettings: "'FILL' 1" } : {}}>
              star
            </span>
          )}
          <span>
            {rating ? `${rating}/10` : activeEmotion ? activeEmotion.label : "Rate & React"}
          </span>
        </span>
      </button>

      {/* Desktop Inline Popover */}
      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {showDesktopPopover && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "fixed",
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                transform: "translateY(-100%)",
              }}
              className="portal-popover z-[999] hidden w-[290px] rounded-2xl border border-white/10 bg-zinc-950/98 p-4 shadow-2xl backdrop-blur-2xl md:block"
            >
              <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400 text-center border-b border-white/5 pb-2">
                {label} Feedback
              </div>
              <PickerContent />
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Mobile Drawer (Bottom Sheet) */}
      <AnimatePresence>
        {showDrawer && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
              className="fixed inset-0 z-[100] md:hidden bg-black/80 backdrop-blur-md"
            />
            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-[101] md:hidden rounded-t-[2.5rem] border-t border-white/10 bg-zinc-950 px-6 pb-10 pt-4 shadow-2xl"
            >
              {/* Drag Handle indicator */}
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-white/15" onClick={() => setShowDrawer(false)} />
              <div className="mb-4 text-center font-semibold text-lg text-white">
                Rate & React
              </div>
              <PickerContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
