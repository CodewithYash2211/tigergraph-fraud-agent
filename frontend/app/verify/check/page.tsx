"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { GateFrame } from "@/components/GateFrame";
import { useInvestigation } from "@/lib/state/investigation";

// Safe character set omitting confusing characters: O/0, I/1, l, S/5
const CHAR_SET = "2346789ABCDEFGHJKLMNPQRTUVWXY";
const CAPTCHA_LENGTH = 5;

function generateCode(): string {
  let result = "";
  for (let i = 0; i < CAPTCHA_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * CHAR_SET.length);
    result += CHAR_SET[randomIndex];
  }
  return result;
}

/**
 * Draws an authentic distorted CAPTCHA with wave distortions, noise lines, and character rotations.
 * Keeps colors firmly within the rose-neutral design tokens.
 */
function drawCaptcha(canvas: HTMLCanvasElement, code: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Background - soft rose neutral
  ctx.fillStyle = "#faf2f4";
  ctx.fillRect(0, 0, w, h);

  // Subtle background texture / grid dots
  ctx.fillStyle = "rgba(232, 107, 122, 0.12)";
  for (let x = 8; x < w; x += 14) {
    for (let y = 8; y < h; y += 14) {
      ctx.beginPath();
      ctx.arc(x + (Math.random() * 2 - 1), y + (Math.random() * 2 - 1), 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Subtle background wave lines
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = i === 0 ? "rgba(232, 107, 122, 0.28)" : "rgba(30, 30, 45, 0.12)";
    ctx.lineWidth = 1.2 + Math.random() * 0.8;
    ctx.beginPath();
    const startY = h * (0.2 + Math.random() * 0.6);
    ctx.moveTo(0, startY);
    const cp1x = w * 0.3;
    const cp1y = h * Math.random();
    const cp2x = w * 0.7;
    const cp2y = h * Math.random();
    const endY = h * (0.2 + Math.random() * 0.6);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, w, endY);
    ctx.stroke();
  }

  // Render individual characters with slight rotation, offset, and color variation
  const charColors = ["#1e1e2d", "#e86b7a", "#4a4248", "#d25467", "#2b2b3a"];
  const charSpacing = (w - 40) / code.length;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const x = 24 + i * charSpacing + (Math.random() * 6 - 3);
    const y = h / 2 + 10 + (Math.random() * 8 - 4);
    const angle = (Math.random() * 36 - 18) * (Math.PI / 180);
    const fontSize = 32 + Math.floor(Math.random() * 6);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.font = `600 ${fontSize}px "IBM Plex Mono", monospace`;
    ctx.fillStyle = charColors[i % charColors.length];
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Text shadow for subtle depth
    ctx.shadowColor = "rgba(232, 107, 122, 0.25)";
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.fillText(char, 0, 0);
    ctx.restore();
  }

  // Foreground strike-through line
  ctx.strokeStyle = "rgba(232, 107, 122, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(10, h * (0.4 + Math.random() * 0.2));
  ctx.lineTo(w - 10, h * (0.4 + Math.random() * 0.2));
  ctx.stroke();
}

/**
 * Second security step: Classic Typed CAPTCHA with distorted characters.
 * Replaces old checkbox/tile-selection CAPTCHA completely.
 */
export default function SecurityCheck() {
  const router = useRouter();
  const { hydrated, verified, secured, authed, secure } = useInvestigation();

  const [captchaCode, setCaptchaCode] = useState<string>("");
  const [userInput, setUserInput] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "verifying" | "wrong" | "done">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Initialize and regenerate CAPTCHA code
  const refreshCaptcha = useCallback(() => {
    const newCode = generateCode();
    setCaptchaCode(newCode);
    setUserInput("");
    if (status === "wrong") {
      setStatus("idle");
    }
  }, [status]);

  useEffect(() => {
    refreshCaptcha();
  }, []);

  // Redraw canvas whenever code changes
  useEffect(() => {
    if (canvasRef.current && captchaCode) {
      drawCaptcha(canvasRef.current, captchaCode);
    }
  }, [captchaCode]);

  // Handle route guards
  useEffect(() => {
    if (!hydrated || status === "done") return;
    if (authed) router.replace("/role");
    else if (!verified) router.replace("/verify");
    else if (secured) router.replace("/signin");
  }, [hydrated, verified, secured, authed, status, router]);

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (status === "verifying" || status === "done") return;

    const trimmedInput = userInput.trim().toUpperCase();
    if (!trimmedInput) {
      setErrorMessage("Please enter the characters to continue.");
      setStatus("wrong");
      return;
    }

    setStatus("verifying");

    setTimeout(() => {
      if (trimmedInput === captchaCode.toUpperCase()) {
        setStatus("done");
        setErrorMessage(null);
        setTimeout(() => {
          secure();
          router.push("/signin");
        }, 1200);
      } else {
        setStatus("wrong");
        setErrorMessage("Incorrect code. Try again.");
        refreshCaptcha();
        inputRef.current?.focus();
      }
    }, 450);
  };

  return (
    <GateFrame step={1}>
      <div className="w-full max-w-[460px]">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="font-display text-[clamp(28px,4vw,38px)] leading-[1.1]">One more check</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ivory-dim">
            Enter the characters shown below to continue.
          </p>

          <div className="sheet mt-7 p-6 sm:p-7">
            {/* CAPTCHA Visual Canvas Display */}
            <div className="relative overflow-hidden rounded-xl border hairline bg-graphite/50 p-2 shadow-inner">
              <canvas
                ref={canvasRef}
                width={360}
                height={100}
                className="h-[90px] w-full rounded-lg object-cover"
                aria-label="Security verification code"
                role="img"
              />
              <button
                type="button"
                onClick={refreshCaptcha}
                disabled={status === "done" || status === "verifying"}
                aria-label="Generate new code"
                className="absolute right-4 top-4 flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-[12px] font-medium text-ivory shadow-sm ring-1 ring-line backdrop-blur-sm transition-all hover:bg-white hover:text-champagne disabled:opacity-50"
              >
                <RefreshCw size={13} className={clsx(status === "verifying" && "animate-spin")} />
                <span>New code</span>
              </button>
            </div>

            {/* Verification Form */}
            <form onSubmit={handleVerify} className="mt-6 space-y-4" noValidate>
              <div>
                <label htmlFor="captcha-input" className="block text-[13px] font-medium text-ivory-dim">
                  Enter the characters
                </label>
                <div className="mt-1.5 relative">
                  <input
                    id="captcha-input"
                    ref={inputRef}
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck="false"
                    maxLength={CAPTCHA_LENGTH}
                    value={userInput}
                    onChange={(e) => {
                      setUserInput(e.target.value.toUpperCase());
                      if (status === "wrong") {
                        setStatus("idle");
                        setErrorMessage(null);
                      }
                    }}
                    placeholder="e.g. A7K9P"
                    disabled={status === "verifying" || status === "done"}
                    className={clsx(
                      "w-full rounded-xl bg-white px-4 py-3 font-display text-[18px] tracking-[0.2em] text-ivory uppercase ring-1 transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-[14px] placeholder:text-ivory-faint/60 focus:outline-none focus:ring-2",
                      status === "wrong"
                        ? "ring-crimson focus:ring-crimson"
                        : status === "done"
                          ? "ring-sage focus:ring-sage"
                          : "ring-line focus:ring-champagne"
                    )}
                  />
                  {status === "done" && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sage">
                      <Check size={18} strokeWidth={2.5} />
                    </span>
                  )}
                </div>
              </div>

              {/* Status and feedback message */}
              <AnimatePresence mode="wait">
                {status === "wrong" && errorMessage && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-[13px] text-crimson"
                    role="alert"
                  >
                    {errorMessage}
                  </motion.p>
                )}
                {status === "done" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex items-center gap-2 text-[13.5px] font-medium text-sage"
                  >
                    <ShieldCheck size={16} />
                    <span>Verification complete</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={userInput.trim().length === 0 || status === "verifying" || status === "done"}
                  className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[14.5px] font-medium disabled:opacity-50"
                >
                  {status === "verifying" ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Verifying...
                    </>
                  ) : status === "done" ? (
                    "Verified"
                  ) : (
                    "Verify"
                  )}
                </button>
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  disabled={status === "verifying" || status === "done"}
                  className="btn-quiet rounded-xl px-4 py-3 text-[14px]"
                >
                  New code
                </button>
              </div>
            </form>

            <div className="mt-5 border-t hairline pt-4 text-center text-[12px] text-ivory-faint">
              Frontend demo verification. No external CAPTCHA service is used.
            </div>
          </div>
        </motion.div>
      </div>
    </GateFrame>
  );
}
