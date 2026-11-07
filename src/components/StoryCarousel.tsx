"use client";

import Image from "next/image";
import { useState } from "react";

const photos = [
  "https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=900&q=80",
];

const reviews = [
  {
    name: "Ilo musk",
    text: "I didn’t know I needed pelvic floor therapy the way Trapti at Theragurus practices until I went in for my first consult. I learned to breathe down into my pelvic floor, which I didn’t even know about.",
  },
  {
    name: "Rohit Kumar",
    text: "My wife and I cannot recommend TheraGurus, the premium pelvic floor therapy clinic in Santa Clarita, highly enough. Her diastasis recti is completely resolved. Her prolapse has fully healed.",
  },
  {
    name: "Charlize Martinez",
    text: "I came in after having my third baby. When I got in touch with Trapti she was so thorough and genuinely cared about my goals. After a couple sessions my abdomen separation healed drastically.",
  },
  {
    name: "Cozi A.",
    text: "I was pretty nervous and feeling self conscious at my first visit and she made me feel so comfortable. Her office is a safe space where conversations happen without judgement.",
  },
  {
    name: "Jessie Garcia",
    text: "She takes the time to truly listen, explain every step of the process, and tailor each treatment. I’ve noticed significant improvements in strength, control, and overall pelvic health.",
  },
  {
    name: "Fabiola Garduno",
    text: "I started pelvic floor therapy while still pregnant, and I’m already feeling such a positive difference. Trapti made me feel comfortable, supported, and truly listened to.",
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .filter((part) => /[A-Za-z]/.test(part))
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Stars() {
  return (
    <div
      className="mt-1 flex gap-0.5 text-[#e2b340]"
      aria-label="5 star Google review"
    >
      {Array.from({ length: 5 }).map((_, star) => (
        <svg
          key={star}
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 1.3 9.9 5.7l4.8.4-3.7 3.1 1.1 4.7L8 11.4 3.9 13.9l1.1-4.7L1.3 6.1l4.8-.4z" />
        </svg>
      ))}
    </div>
  );
}

function Person({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#edf7df] text-sm font-semibold text-[#2e4856]">
        {initials(name)}
      </span>
      <div>
        <p className="text-[15px] font-semibold text-[#2e4856]">{name}</p>
        <p className="text-xs text-[#526b77]">Google review</p>
        <Stars />
      </div>
    </div>
  );
}

export function StoryCarousel() {
  const [index, setIndex] = useState(0);
  const count = reviews.length;
  const visible = [0, 1, 2].map((offset) => {
    const reviewIndex = (index + offset) % count;
    return {
      ...reviews[reviewIndex],
      photo: photos[reviewIndex % photos.length],
      layout: offset === 1 ? "media-top" : "media-bottom",
    };
  });

  return (
    <div>
      <div className="grid items-stretch gap-4 lg:grid-cols-3">
        {visible.map((review) => (
          <article
            key={review.name}
            className="flex flex-col rounded-[28px] bg-white p-4 shadow-[0_10px_30px_rgba(28,36,28,0.05)]"
          >
            {review.layout === "media-top" && (
              <div className="relative mb-4 h-64 overflow-hidden rounded-[20px]">
                <Image
                  src={review.photo}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 30vw, 100vw"
                />
              </div>
            )}
            <Person name={review.name} />
            <p className="mt-4 flex-1 text-sm leading-relaxed text-[#526b77]">
              “{review.text}”
            </p>
            {review.layout === "media-bottom" && (
              <div className="relative mt-4 h-44 overflow-hidden rounded-[20px]">
                <Image
                  src={review.photo}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 30vw, 100vw"
                />
              </div>
            )}
          </article>
        ))}
      </div>
      <div className="mt-8 flex justify-center gap-3">
        <button
          type="button"
          aria-label="Previous stories"
          onClick={() => setIndex((value) => (value - 1 + count) % count)}
          className="grid h-11 w-11 place-items-center rounded-full border border-[#2e4856] text-[#2e4856]"
        >
          <svg
            viewBox="0 0 16 16"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <path
              d="M10 3.5 5.5 8 10 12.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Next stories"
          onClick={() => setIndex((value) => (value + 1) % count)}
          className="grid h-11 w-11 place-items-center rounded-full bg-[#2e4856] text-white"
        >
          <svg
            viewBox="0 0 16 16"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <path
              d="M6 3.5 10.5 8 6 12.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
