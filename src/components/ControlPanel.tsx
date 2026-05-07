import { Accordion } from "./Accordion";
import { InputSection } from "./InputSection";
import { ToggleGroup } from "./ToggleGroup";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download } from "lucide-react";
import type { BookletSettings, BookletState } from "@/hooks/useBooklet";

const asNum = (v: number | readonly number[]) =>
  Array.isArray(v) ? (v as number[])[0]! : (v as number);

interface Props {
  state: BookletState;
  onUpdateSettings: (patch: Partial<BookletSettings>) => void;
  onLoadPdf: (file: File) => void;
  onClear: () => void;
  onGenerate: () => void;
}

export function ControlPanel({
  state,
  onUpdateSettings,
  onLoadPdf,
  onClear,
  onGenerate,
}: Props) {
  const { settings, generating, progress, pageCount, pdfFile, layout } = state;
  const canGenerate = !!layout && !generating;

  return (
    <aside className="flex flex-col gap-4 overflow-y-auto pr-1">
      <InputSection
        pageCount={pageCount}
        pdfFile={pdfFile}
        onLoadPdf={onLoadPdf}
        onClear={onClear}
      />

      {/* Layout */}
      <Accordion title="Layout">
        <FormRow label="Reading Direction">
          <ToggleGroup
            options={[
              {
                value: "ltr",
                label: "← LTR",
                title: "Left-to-right (English, French…)",
              },
              {
                value: "rtl",
                label: "RTL →",
                title: "Right-to-left (Arabic, Hebrew…)",
              },
            ]}
            value={settings.direction}
            onChange={(v) => onUpdateSettings({ direction: v })}
          />
        </FormRow>

        <FormRow
          label="Signature Size"
          hint="A signature is a set of sheets nested together."
        >
          <Select
            value={String(settings.signatureSize)}
            onValueChange={(v) =>
              v != null && onUpdateSettings({ signatureSize: Number(v) })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">4 pages · 1 sheet/sig</SelectItem>
              <SelectItem value="8">8 pages · 2 sheets/sig</SelectItem>
              <SelectItem value="16">16 pages · 4 sheets/sig</SelectItem>
              <SelectItem value="32">32 pages · 8 sheets/sig</SelectItem>
              <SelectItem value="0">All-in-one (single signature)</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>

        <FormRow label="Duplex Flip">
          <ToggleGroup
            options={[
              {
                value: "long",
                label: "Long Edge",
                title: "Standard landscape flip — most printers",
              },
              {
                value: "short",
                label: "Short Edge",
                title: "Short-edge flip — portrait layout printers",
              },
            ]}
            value={settings.flip}
            onChange={(v) => onUpdateSettings({ flip: v })}
          />
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            In your printer dialog:{" "}
            <span className="font-medium text-foreground">
              Orientation → Landscape
            </span>
            {" · "}
            <span className="font-medium text-foreground">
              Two-sided →{" "}
              {settings.flip === "long"
                ? "Flip on Long Edge"
                : "Flip on Short Edge"}
            </span>
          </p>
        </FormRow>
      </Accordion>

      {/* Paper */}
      <Accordion title="Paper">
        <FormRow label="Output Paper Size">
          <Select
            value={settings.paperSize}
            onValueChange={(v) =>
              v != null && onUpdateSettings({ paperSize: v })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A4">A4 — 297 × 210 mm</SelectItem>
              <SelectItem value="Letter">Letter — 11 × 8.5 in</SelectItem>
              <SelectItem value="A3">A3 — 420 × 297 mm</SelectItem>
              <SelectItem value="Tabloid">Tabloid — 17 × 11 in</SelectItem>
              <SelectItem value="Legal">Legal — 14 × 8.5 in</SelectItem>
              <SelectItem value="A5">
                A5 — 210 × 148 mm (booklet → A6)
              </SelectItem>
            </SelectContent>
          </Select>
        </FormRow>

        <FormRow label="Page Scaling">
          <Select
            value={settings.scaling}
            onValueChange={(v) =>
              v != null &&
              onUpdateSettings({ scaling: v as BookletSettings["scaling"] })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fit">Fit to half-page</SelectItem>
              <SelectItem value="fill">Fill half-page (may clip)</SelectItem>
              <SelectItem value="actual">Actual size (1:1)</SelectItem>
              <SelectItem value="custom">Custom scale</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>

        {settings.scaling === "custom" && (
          <FormRow label="Scale factor">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings.customScale}
                min={0.1}
                max={3}
                step={0.05}
                onChange={(e) =>
                  onUpdateSettings({ customScale: Number(e.target.value) })
                }
                className="w-20 h-8 rounded-md border border-input bg-background px-2 text-xs text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <span className="text-xs text-muted-foreground">
                × (1.0 = 100%)
              </span>
            </div>
          </FormRow>
        )}
      </Accordion>

      {/* Margins */}
      <Accordion title="Margins">
        <FormRow label={`Binding (gutter): ${settings.bindingMarginMm} mm`}>
          <Slider
            min={0}
            max={30}
            step={1}
            value={[settings.bindingMarginMm]}
            onValueChange={(v) =>
              onUpdateSettings({ bindingMarginMm: asNum(v) })
            }
          />
        </FormRow>
        <FormRow label={`Outer margin: ${settings.outerMarginMm} mm`}>
          <Slider
            min={0}
            max={20}
            step={1}
            value={[settings.outerMarginMm]}
            onValueChange={(v) => onUpdateSettings({ outerMarginMm: asNum(v) })}
          />
        </FormRow>
      </Accordion>

      {/* Options */}
      <Accordion title="Options">
        <FormRow label="Page Numbers">
          <Select
            value={settings.pageNumbers}
            onValueChange={(v) =>
              v != null &&
              onUpdateSettings({
                pageNumbers: v as BookletSettings["pageNumbers"],
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="bottom-center">Bottom Center</SelectItem>
              <SelectItem value="outer">Outer Edge</SelectItem>
              <SelectItem value="inner">Inner (binding) Edge</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>

        <div className="space-y-2">
          {(
            [
              ["separateCover", "Separate cover sheet (blank back)"],
              ["cropMarks", "Crop / trim marks"],
              ["centerLine", "Center fold guide line"],
              ["blankPageMark", "Mark blank pages (debug)"],
            ] as [keyof BookletSettings, string][]
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <Checkbox
                checked={settings[key] as boolean}
                onCheckedChange={(v) => onUpdateSettings({ [key]: v === true })}
              />
              <span className="text-xs">{label}</span>
            </label>
          ))}
        </div>

        <FormRow label="Blank page fill">
          <ToggleGroup
            options={[
              { value: "white", label: "White" },
              { value: "gray", label: "Light gray" },
            ]}
            value={settings.blankColor}
            onChange={(v) => onUpdateSettings({ blankColor: v })}
          />
        </FormRow>
      </Accordion>

      {/* Advanced */}
      <Accordion title="Advanced" defaultOpen={false}>
        <FormRow label="Render Quality">
          <Select
            value={String(settings.quality)}
            onValueChange={(v) =>
              v != null && onUpdateSettings({ quality: Number(v) })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1.5">Draft (1.5×, fast)</SelectItem>
              <SelectItem value="2">High (2×, recommended)</SelectItem>
              <SelectItem value="3">Ultra (3×, slow)</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>
        <FormRow
          label={`Creep compensation: ${settings.creepMm.toFixed(1)} mm/sheet`}
        >
          <Slider
            min={0}
            max={3}
            step={0.1}
            value={[settings.creepMm]}
            onValueChange={(v) => onUpdateSettings({ creepMm: asNum(v) })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Shifts inner pages outward to compensate for paper thickness.
          </p>
        </FormRow>
      </Accordion>

      {/* Generate */}
      <div className="space-y-2 pt-1">
        {progress && (
          <div className="space-y-1">
            <Progress value={progress.pct} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {progress.text}
            </p>
          </div>
        )}
        <Button className="w-full" disabled={!canGenerate} onClick={onGenerate}>
          <Download className="size-4 mr-2" />
          Generate Booklet PDF
        </Button>
      </div>
    </aside>
  );
}

function FormRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs flex items-center gap-1">
        {label}
        {hint && (
          <span className="text-muted-foreground cursor-help" title={hint}>
            (?)
          </span>
        )}
      </Label>
      {children}
    </div>
  );
}
