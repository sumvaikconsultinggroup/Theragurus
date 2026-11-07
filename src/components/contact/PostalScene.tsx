"use client";

import { useId, useState } from "react";
import { useMotionValueEvent, type MotionValue } from "framer-motion";
import {
  doorPaths,
  envelopeFlaps,
  flapOpacity,
  flagPaths,
  mailboxNudge,
  mailboxOpacity,
  mailboxShift,
  paperHeight,
  paperOpacity,
  paperRadius,
  paperShadow,
  paperTransform,
  sceneOpacity,
  sceneScale,
  sealMotion,
  slotShade,
  type PaperBox,
} from "@/components/contact/postal";

const PAPER = "#ffffff";
const SEAL = "#A82B32";
const MAILBOX = "#343E3C";

const WAX_EDGE =
  "M48.2 6.2 C56.4 4.4 62.1 8.2 69.4 9.7 C78.2 11.5 82.3 18.2 85.3 25.1 C90.3 30.3 91.7 36.5 91.2 43.3 C94.2 51.4 91.7 58.3 88.7 64.4 C87.6 73.2 81.6 78.6 74.7 82.7 C69.7 88.9 62.4 90.2 55.4 89.8 C47.7 93.2 41.2 90.3 34.4 88.2 C25.5 87.3 20.3 81.8 17.2 75 C10.1 69.7 9.1 61.7 9.6 54.6 C6.2 47.2 8.9 40.5 11.1 34.3 C11.6 25.6 17.3 20.1 23.6 16.7 C29.3 9.4 37.6 7.9 43.3 8.1 C45.2 7.4 46.3 6.7 48.2 6.2Z";
const WAX_FACE =
  "M49.3 16.2 C67.8 15.2 81.6 29.1 81.7 47.7 C82.4 66.3 69.4 80.5 50.4 80.9 C31.2 81.5 17.6 68 17.3 49.5 C16.7 31 30.4 17 49.3 16.2Z";
const WAX_MARK =
  "M41.2 59.4 C34.3 59.5 30.7 54.2 31.9 47.3 C38.5 47.7 42.3 52.4 41.2 59.4Z M45.3 53.9 C51.7 46.3 57.2 45.1 63.9 46.7 C61.5 53.6 54.5 57.4 45.3 53.9Z M49.2 43.5 C41.8 42.5 38.1 36.7 39.6 30.1 C46.2 30.4 50.4 35.6 49.2 43.5Z M54.4 37.1 C57.2 29.8 62.3 26.9 68.1 28.1 C67.5 34.3 62.1 39 54.4 37.1Z";

export function PostalScene({
  progress,
  box,
}: {
  progress: MotionValue<number>;
  box: PaperBox;
}) {
  const [frame, setFrame] = useState(progress.get());
  useMotionValueEvent(progress, "change", setFrame);
  const rawId = useId().replace(/:/g, "");
  const id = (name: string) => `${rawId}-${name}`;
  const flaps = envelopeFlaps(frame);
  const door = doorPaths(frame);
  const flag = flagPaths(frame);
  const seal = sealMotion(frame);
  const shift = mailboxShift(frame);
  const height = paperHeight(frame, box);
  const radius = paperRadius(frame, box);
  const mailOpacity = mailboxOpacity(frame);

  return (
    <div
      className="postal-scene"
      data-send-scene
      aria-hidden="true"
      style={{ perspective: 1200, height: box.height }}
    >
      <div
        className="postal-scene-fit"
        style={{
          opacity: sceneOpacity(frame),
          transform: `scale(${sceneScale(frame)})`,
        }}
      >
        <Mailbox
          id={id}
          layer="back"
          opacity={mailOpacity}
          shift={shift}
          box={box}
          door={door}
          flag={flag}
        />
        <div
          className="postal-paper"
          data-send-paper
          style={{
            height,
            marginTop: -height / 2,
            transform: paperTransform(frame, box),
            opacity: paperOpacity(frame),
            border: box.border,
            borderRadius: radius,
            boxShadow: paperShadow(frame, box),
          }}
        >
          <svg viewBox="0 0 1000 600" preserveAspectRatio="none" width="100%" height="100%" style={{ opacity: flapOpacity(frame) }}>
            <defs>
              <linearGradient id={id("left")} x1="0" y1="0" x2="1" y2="0.5">
                <stop stopColor="#181614" stopOpacity="0" />
                <stop offset="1" stopColor="#181614" stopOpacity="0.065" />
              </linearGradient>
              <linearGradient id={id("right")} x1="1" y1="0" x2="0" y2="0.5">
                <stop stopColor="#181614" stopOpacity="0" />
                <stop offset="1" stopColor="#181614" stopOpacity="0.055" />
              </linearGradient>
              <linearGradient id={id("top")} x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#181614" stopOpacity="0" />
                <stop offset="1" stopColor="#181614" stopOpacity="0.045" />
              </linearGradient>
              <linearGradient id={id("pocket")} x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#181614" stopOpacity="0.07" />
                <stop offset="0.5" stopColor="#181614" stopOpacity="0" />
                <stop offset="1" stopColor="#181614" stopOpacity="0.015" />
              </linearGradient>
            </defs>
            <rect width="1000" height="600" rx={(radius / Math.max(1, box.width)) * 1000} ry={(radius / Math.max(1, height)) * 600} fill={PAPER} />
            <rect width="1000" height="600" rx={(radius / Math.max(1, box.width)) * 1000} ry={(radius / Math.max(1, height)) * 600} fill="#181614" fillOpacity="0.045" />
            <path d={flaps.left} fill={PAPER} stroke="rgba(24,22,20,.12)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            <path d={flaps.left} fill={`url(#${id("left")})`} />
            <path d={flaps.right} fill={PAPER} stroke="rgba(24,22,20,.12)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            <path d={flaps.right} fill={`url(#${id("right")})`} />
            <path d="M0 592 L0 586 L480 259 Q500 245 520 259 L1000 586 L1000 592 Q1000 600 992 600 L8 600 Q0 600 0 592Z" fill={PAPER} />
            <path d="M0 592 L0 586 L480 259 Q500 245 520 259 L1000 586 L1000 592 Q1000 600 992 600 L8 600 Q0 600 0 592Z" fill={`url(#${id("pocket")})`} />
            <path d="M0 586 L480 259 Q500 245 520 259 L1000 586" fill="none" stroke="rgba(24,22,20,.11)" strokeWidth="0.65" vectorEffect="non-scaling-stroke" />
            <path d="M3 589 L482 262 Q500 249 518 262 L997 589" fill="none" stroke="rgba(255,255,255,.65)" strokeWidth="0.65" vectorEffect="non-scaling-stroke" />
            <path d={flaps.top} fill={PAPER} stroke="rgba(24,22,20,.14)" strokeWidth="0.75" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            <path d={flaps.top} fill={`url(#${id("top")})`} />
            <path d={flaps.top} fill="#181614" fillOpacity={flaps.topShade} />
            <path d="M8 1 H992" stroke="rgba(255,255,255,.65)" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
          </svg>
          <div
            className="postal-seal"
            style={{
              width: 64,
              height: 64,
              marginLeft: -32,
              marginTop: -32,
              opacity: seal.opacity,
              transform: `translateY(${seal.y}px) scale(${seal.scale})`,
            }}
          >
            <WaxSeal gid={id} />
          </div>
          <div className="postal-slot-shade" style={{ height: slotShade(frame) }} />
        </div>
        <Mailbox
          id={id}
          layer="front"
          opacity={mailOpacity}
          shift={shift}
          box={box}
          door={door}
          flag={flag}
        />
      </div>
    </div>
  );
}

function WaxSeal({ gid }: { gid: (name: string) => string }) {
  return (
    <svg viewBox="0 0 100 100" width="64" height="64" aria-hidden="true">
      <defs>
        <radialGradient id={gid("wax-face")} cx="25%" cy="15%" r="95%">
          <stop stopColor="#F3D7CE" stopOpacity="0.14" />
          <stop offset="0.42" stopColor="#F3D7CE" stopOpacity="0.025" />
          <stop offset="0.74" stopColor="#17070B" stopOpacity="0.035" />
          <stop offset="1" stopColor="#17070B" stopOpacity="0.23" />
        </radialGradient>
        <linearGradient id={gid("wax-edge")} x1="13%" y1="4%" x2="78%" y2="98%">
          <stop stopColor="#E9BEB3" stopOpacity="0.24" />
          <stop offset="0.44" stopColor="#E9BEB3" stopOpacity="0.035" />
          <stop offset="0.7" stopColor="#1B060A" stopOpacity="0.09" />
          <stop offset="1" stopColor="#1B060A" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id={gid("wax-press")} x1="22%" y1="0%" x2="74%" y2="100%">
          <stop stopColor="#1B060A" stopOpacity="0.19" />
          <stop offset="0.34" stopColor="#1B060A" stopOpacity="0.045" />
          <stop offset="0.75" stopColor="#F0C9BE" stopOpacity="0.015" />
          <stop offset="1" stopColor="#F0C9BE" stopOpacity="0.09" />
        </linearGradient>
        <linearGradient id={gid("wax-mark")} x1="12%" y1="0%" x2="77%" y2="100%">
          <stop stopColor="#23070C" stopOpacity="0.26" />
          <stop offset="0.65" stopColor="#23070C" stopOpacity="0.12" />
          <stop offset="1" stopColor="#23070C" stopOpacity="0.075" />
        </linearGradient>
      </defs>
      <path d={WAX_EDGE} transform="translate(0.2 2.8)" fill="#190A0D" fillOpacity="0.09" />
      <path d={WAX_EDGE} transform="translate(0 1.5)" fill={SEAL} />
      <path d={WAX_EDGE} transform="translate(0 1.5)" fill="#1B060A" fillOpacity="0.23" />
      <path d={WAX_EDGE} fill={SEAL} />
      <path d={WAX_EDGE} fill={`url(#${gid("wax-face")})`} />
      <path d={WAX_EDGE} stroke={`url(#${gid("wax-edge")})`} strokeWidth="1.2" />
      <path d={WAX_FACE} fill={SEAL} />
      <path d={WAX_FACE} fill={`url(#${gid("wax-press")})`} stroke="#24080E" strokeOpacity="0.14" strokeWidth="1.7" />
      <path d={WAX_MARK} fill={SEAL} />
      <path d={WAX_MARK} fill={`url(#${gid("wax-mark")})`} />
      <path d="M36.9 68.8 C39.9 56.7 48.2 40.7 60.6 28.9" stroke="#25090F" strokeOpacity="0.27" strokeWidth="1.65" strokeLinecap="round" />
    </svg>
  );
}

function Mailbox({
  id,
  layer,
  opacity,
  shift,
  box,
  door,
  flag,
}: {
  id: (name: string) => string;
  layer: "back" | "front";
  opacity: number;
  shift: { x: number; y: number };
  box: PaperBox;
  door: ReturnType<typeof doorPaths>;
  flag: ReturnType<typeof flagPaths>;
}) {
  return (
    <div
      className="postal-mailbox"
      data-send-mailbox={layer}
      style={{
        top: box.height / 2 - box.width / 3 + mailboxNudge.y,
        width: box.width,
        height: (box.width * 2) / 3,
        opacity,
        transform: `translate(${shift.x + mailboxNudge.x}px, ${shift.y}px)`,
        zIndex: layer === "back" ? 0 : 2,
      }}
    >
      <svg viewBox="0 0 600 400" width="100%" height="100%">
        <defs>
          <linearGradient id={id(`roof-${layer}`)} x1="341" y1="84" x2="454" y2="216" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity="0.23" />
            <stop offset="0.34" stopColor="white" stopOpacity="0.1" />
            <stop offset="0.69" stopColor="black" stopOpacity="0.03" />
            <stop offset="1" stopColor="black" stopOpacity="0.24" />
          </linearGradient>
          <linearGradient id={id(`side-${layer}`)} x1="370" y1="163" x2="492" y2="268" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity="0.03" />
            <stop offset="1" stopColor="black" stopOpacity="0.31" />
          </linearGradient>
          <linearGradient id={id(`inside-${layer}`)} x1="276" y1="167" x2="401" y2="231" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0C1413" />
            <stop offset="0.55" stopColor="#111D1A" />
            <stop offset="1" stopColor="#263631" />
          </linearGradient>
          <linearGradient id={id(`door-${layer}`)} x1="242" y1="104" x2="313" y2="321" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity="0.18" />
            <stop offset="0.48" stopColor="white" stopOpacity="0.025" />
            <stop offset="1" stopColor="black" stopOpacity="0.21" />
          </linearGradient>
          <linearGradient id={id(`brass-${layer}`)} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#E6D5A4" />
            <stop offset="0.46" stopColor="#B79B60" />
            <stop offset="1" stopColor="#806B44" />
          </linearGradient>
          <linearGradient id={id(`post-${layer}`)} x1="411" y1="270" x2="438" y2="270" gradientUnits="userSpaceOnUse">
            <stop stopColor="#958B77" />
            <stop offset="0.36" stopColor="#A69B85" />
            <stop offset="1" stopColor="#756D5D" />
          </linearGradient>
          <radialGradient id={id(`ground-${layer}`)}>
            <stop stopColor="#17241F" stopOpacity="0.2" />
            <stop offset="0.5" stopColor="#17241F" stopOpacity="0.075" />
            <stop offset="1" stopColor="#17241F" stopOpacity="0" />
          </radialGradient>
        </defs>
        {layer === "back" ? (
          <>
            <ellipse cx="414" cy="357" rx="132" ry="23" fill={`url(#${id("ground-back")})`} />
            <path d="M411 245 L430 240 L445 249 L426 255 Z" fill="#B0A38B" />
            <path d="M411 245 L426 251 L426 352 L411 346 Z" fill={`url(#${id("post-back")})`} />
            <path d="M426 251 L442 247 L442 347 L426 352 Z" fill="#716A5A" />
            <path d="M387 261 L446 245 L469 250 L412 267 Z" fill="#26352F" />
            <path d="M412 267 L469 250 L469 256 L412 272 Z" fill="#16221D" />
            <path d="M387 261 L412 267 L412 272 L387 266 Z" fill="#43534A" />
            <path d="M270 155 L425 115 C425 81.86 449.174 59.298 479 64.6 L324 104.6 C294.174 99.298 270 121.86 270 155 Z" fill={MAILBOX} />
            <path d="M270 155 L425 115 C425 81.86 449.174 59.298 479 64.6 L324 104.6 C294.174 99.298 270 121.86 270 155 Z" fill={`url(#${id("roof-back")})`} />
            <path d="M270 255 L270 155 C270 121.86 294.174 99.298 324 104.6 C353.826 109.902 378 141.06 378 174.2 L378 274.2 Z" fill={`url(#${id("inside-back")})`} />
            <path d="M274 253 L371 269 L506 234 L410 217 Z" fill="#314238" />
          </>
        ) : (
          <>
            <path d="M324 104.6 L479 64.6 C508.826 69.902 533 101.06 533 134.2 L378 174.2 C378 141.06 353.826 109.902 324 104.6 Z" fill={MAILBOX} />
            <path d="M324 104.6 L479 64.6 C508.826 69.902 533 101.06 533 134.2 L378 174.2 C378 141.06 353.826 109.902 324 104.6 Z" fill={`url(#${id("roof-front")})`} />
            <path d="M378 174.2 L533 134.2 L533 234.2 L378 274.2 Z" fill={MAILBOX} />
            <path d="M378 174.2 L533 134.2 L533 234.2 L378 274.2 Z" fill={`url(#${id("side-front")})`} />
            <path d="M324 104.6 C353.826 109.902 378 141.06 378 174.2 L378 274.2 L270 255" fill="none" stroke="#15241D" strokeWidth="6" strokeLinejoin="round" />
            <path d="M324 104.6 C353.826 109.902 378 141.06 378 174.2 L378 273" fill="none" stroke={MAILBOX} strokeWidth="3.2" strokeLinejoin="round" />
            <path d={door.door} fill={MAILBOX} stroke="#14221B" strokeWidth="1.7" strokeLinejoin="round" />
            <path d={door.door} fill={`url(#${id("door-front")})`} />
            <path d={door.door} fill="#07120C" opacity={door.shade} />
            <path d={door.inner} fill="none" stroke="white" strokeOpacity="0.13" strokeWidth="0.8" />
            <path d={door.rim} fill="none" stroke="white" strokeOpacity="0.19" strokeWidth="0.8" strokeLinecap="round" />
            <path d={door.plate} fill={`url(#${id("brass-front")})`} stroke="#6B593A" strokeWidth="0.8" strokeLinejoin="round" />
            <path d={door.slot} fill="none" stroke="#F2E3BD" strokeWidth="0.7" strokeLinecap="round" />
            <path d="M283.5 257.4 L305.5 261.3 M341.5 267.7 L363.5 271.6" stroke="#17261D" strokeWidth="6" strokeLinecap="round" />
            <path d="M283.5 256.8 L305.5 260.7 M341.5 267.1 L363.5 271" stroke="#6D7A6D" strokeWidth="2" strokeLinecap="round" />
            <path d={flag.flag} fill={SEAL} stroke="#612623" strokeWidth="0.8" strokeLinejoin="round" />
            <path d={flag.edge} fill="none" stroke="white" strokeOpacity="0.22" strokeWidth="1.1" strokeLinecap="round" />
            <path d={flag.crease} fill="none" stroke="black" strokeOpacity="0.12" strokeWidth="0.7" />
            <ellipse cx="470" cy="189" rx="5" ry="5.3" fill="#17281D" />
            <ellipse cx="470" cy="189" rx="3.1" ry="3.3" fill={`url(#${id("brass-front")})`} />
          </>
        )}
      </svg>
    </div>
  );
}
