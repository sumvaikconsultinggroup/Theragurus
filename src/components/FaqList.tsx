"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { faqs } from "@/lib/faqs";

export function FaqList() {
  const [open, setOpen] = useState(0);
  const reduced = useReducedMotion();

  return (
    <div className="flex flex-col gap-3">
      {faqs.map((item, index) => {
        const expanded = open === index;
        return (
          <div
            key={item.q}
            className={`rounded-[22px] px-5 py-4 md:px-6 ${expanded ? "bg-[#edf7df]" : "bg-white"}`}
          >
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={`faq-answer-${index}`}
              id={`faq-question-${index}`}
              onClick={() => setOpen(expanded ? -1 : index)}
              className="flex w-full items-start justify-between gap-4 text-left"
            >
              <span className="text-[15px] font-semibold leading-snug text-[#2e4856] md:text-base">
                {item.q}
              </span>
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg leading-none text-[#2e4856] ${
                  expanded ? "bg-white/70" : "bg-[#f0f5f5]"
                }`}
                aria-hidden="true"
              >
                {expanded ? "–" : "+"}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  id={`faq-answer-${index}`}
                  role="region"
                  aria-labelledby={`faq-question-${index}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <p className="mt-3 max-w-xl pr-5 text-sm leading-relaxed text-[#526b77]">
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
