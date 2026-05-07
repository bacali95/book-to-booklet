import { useEffect, useState } from "react";
import { Moon, Sun, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ControlPanel } from "./components/ControlPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { useBooklet } from "./hooks/useBooklet";

export default function App() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved
      ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const { state, updateSettings, loadPdf, clearSource, generate } =
    useBooklet();

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="size-5 text-primary" />
            <h1 className="font-semibold text-base">Book to Booklet</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDark((d) => !d)}
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>
      </header>

      {/* Main two-column layout */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
        <ControlPanel
          state={state}
          onUpdateSettings={updateSettings}
          onLoadPdf={loadPdf}
          onClear={clearSource}
          onGenerate={generate}
        />
        <PreviewPanel state={state} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Book to Booklet Converter —{" "}
        <a
          href="https://github.com/bacali95/pdf-to-booklet"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          open source on GitHub
        </a>
        . Print with <em>duplex, flip on long edge</em> for correct results.
      </footer>
    </div>
  );
}
