import { useEffect, useRef, useState } from "react";

interface CopyObsUrlButtonProps {
  readonly url: string;
}

type CopyState = "idle" | "copied" | "failed";

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    document.body.append(textarea);
    textarea.select();

    const copied = document.execCommand("copy");
    textarea.remove();

    if (!copied) {
      throw new Error("Copy failed");
    }
  }
}

export function CopyObsUrlButton({ url }: CopyObsUrlButtonProps) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }

    try {
      await copyText(url);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    resetTimeoutRef.current = window.setTimeout(() => {
      setCopyState("idle");
      resetTimeoutRef.current = null;
    }, 2000);
  }

  return (
    <button
      className="secondary-button"
      onClick={() => void handleCopy()}
      title={url}
      type="button"
    >
      {copyState === "copied"
        ? "Copied"
        : copyState === "failed"
          ? "Copy failed"
          : "Copy OBS URL"}
    </button>
  );
}
