import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ControlPanel } from "./components/ControlPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { useBooklet } from "./hooks/useBooklet";
import { LANGUAGES, RTL_LANGS, type LangCode } from "./i18n";

export default function App() {
  const { t, i18n } = useTranslation();

  const [theme, setTheme] = useState<"dark" | "light" | "system">(() => {
    const s = localStorage.getItem("theme");
    if (s === "dark" || s === "light" || s === "system") return s;
    return "system";
  });

  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolvedTheme =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    localStorage.setItem("theme", theme);
  }, [resolvedTheme, theme]);

  useEffect(() => {
    document.documentElement.dir = RTL_LANGS.has(i18n.language) ? "rtl" : "ltr";
  }, [i18n.language]);

  const { state, updateSettings, loadPdf, clearSource, generate } =
    useBooklet();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    if (file.type === "application/pdf") loadPdf(file);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const { pdfFile, layout, progress } = state;
  const sheetCount = layout?.sheets.length ?? 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg text-fg font-sans">
      {/* Header */}
      <header className="h-14 shrink-0 flex items-center justify-between px-5 border-b border-line bg-e1 z-10">
        <div className="flex items-center gap-3.5">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent text-accent-fg grid place-items-center shrink-0">
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 4h7v16H3z" />
                <path d="M14 4h7v16h-7z" />
                <path d="M10 6v12M14 6v12" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-[14px] tracking-[-0.01em]">
                {t("app.title")}
              </div>
              <div className="text-[11px] text-fg3 font-mono tracking-[0.02em]">
                {t("app.subtitle")}
              </div>
            </div>
          </div>

          {pdfFile && layout && (
            <>
              <div className="w-px h-6 bg-line" />
              <div className="flex items-center gap-2.5 px-3 py-1.5 pe-2 bg-e2 border border-line rounded-[6px]">
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-fg2"
                >
                  <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                  <path d="M14 3v5h5" />
                </svg>
                <div className="flex flex-col leading-tight">
                  <span className="text-[13px] font-medium text-fg">
                    {pdfFile.name}
                  </span>
                  <span className="text-[11px] text-fg3 font-mono">
                    {t("app.pagesSheets", {
                      pages: state.pageCount,
                      sheets: sheetCount,
                    })}
                  </span>
                </div>
                <button
                  onClick={clearSource}
                  title={t("app.removeFile")}
                  className="w-[22px] h-[22px] rounded grid place-items-center text-fg3 hover:bg-e3 hover:text-fg border-none bg-transparent cursor-pointer"
                >
                  <svg
                    width={13}
                    height={13}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <div className="relative flex items-center">
            <select
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value as LangCode)}
              className="h-8 ps-2.5 pe-7 bg-transparent text-fg2 border border-transparent rounded-lg text-[13px] font-sans cursor-pointer appearance-none focus:outline-2 focus:outline-accent hover:bg-e2 hover:border-line transition-all"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <svg
              width={11}
              height={11}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute end-2 pointer-events-none text-fg3"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>

          {/* Theme toggle: light → dark → system → light */}
          <button
            onClick={() =>
              setTheme((t) =>
                t === "light" ? "dark" : t === "dark" ? "system" : "light",
              )
            }
            title={theme}
            className="w-8 h-8 rounded-lg border border-transparent bg-transparent text-fg2 grid place-items-center cursor-pointer hover:bg-e2 hover:border-line transition-all"
          >
            {theme === "light" ? (
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : theme === "dark" ? (
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {!pdfFile ? (
        /* Empty state */
        <div className="flex-1 grid place-items-center p-10 overflow-auto">
          <div
            className={`max-w-[540px] w-full text-center px-10 py-14 bg-e1 border-[1.5px] border-dashed rounded-[14px] transition-colors ${dragging ? "border-accent bg-accent-soft" : "border-line"}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div className="w-16 h-16 rounded-2xl bg-accent-soft text-accent grid place-items-center mx-auto mb-5">
              <svg
                width={28}
                height={28}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v12M7 8l5-5 5 5M5 21h14" />
              </svg>
            </div>

            <h1 className="text-[22px] font-semibold tracking-[-0.02em] mb-2.5 text-fg">
              {t("app.emptyHeading")}
            </h1>
            <p className="text-fg2 text-[14px] mb-7">{t("app.emptyDesc")}</p>

            {progress ? (
              <div className="flex flex-col items-center gap-2 mt-6">
                <div className="w-48 h-1 bg-e3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-[width] duration-200"
                    style={{ width: `${progress.pct}%` }}
                  />
                </div>
                <p className="text-[12px] text-fg3 font-mono">
                  {progress.text}
                </p>
              </div>
            ) : (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-accent text-accent-fg border border-accent rounded-[10px] text-[14px] font-semibold cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <svg
                    width={15}
                    height={15}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3v12M7 8l5-5 5 5M5 21h14" />
                  </svg>
                  {t("app.choosePdf")}
                </button>
                <p className="text-[12px] text-fg3 font-mono mt-3">
                  {t("app.dropHint")}
                </p>
              </>
            )}

            <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-line">
              {(
                [t("app.step1"), t("app.step2"), t("app.step3")] as string[]
              ).map((step, i) => (
                <>
                  {i > 0 && (
                    <div key={`line-${i}`} className="w-8 h-px bg-line" />
                  )}
                  <div
                    key={step}
                    className="flex items-center gap-2 text-[12px] text-fg2 font-medium"
                  >
                    <span className="w-[22px] h-[22px] rounded-full bg-e3 text-fg grid place-items-center text-[11px] font-semibold font-mono">
                      {i + 1}
                    </span>
                    {step}
                  </div>
                </>
              ))}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        /* Main layout */
        <div className="flex-1 min-h-0 grid grid-cols-[340px_1fr]">
          <ControlPanel
            state={state}
            onUpdateSettings={updateSettings}
            onGenerate={generate}
          />
          <PreviewPanel state={state} />
        </div>
      )}
    </div>
  );
}
