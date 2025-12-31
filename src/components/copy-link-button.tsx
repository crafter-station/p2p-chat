"use client";

import { useState } from "react";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-600"
    >
      {copied ? "Copied!" : "Copy Link"}
    </button>
  );
}
