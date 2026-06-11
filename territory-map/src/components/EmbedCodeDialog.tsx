import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Check, Copy, Code2, Monitor, Tablet, Smartphone, Eye } from "lucide-react";

interface EmbedCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandSlug: string;
  brandName: string;
  brandColor?: string;
}

const PRESET_SIZES = [
  { label: "Full Width", width: "100%", height: "600", icon: Monitor },
  { label: "Tablet", width: "768", height: "500", icon: Tablet },
  { label: "Compact", width: "480", height: "400", icon: Smartphone },
] as const;

export function EmbedCodeDialog({
  open,
  onOpenChange,
  brandSlug,
  brandName,
  brandColor,
}: EmbedCodeDialogProps) {
  const [width, setWidth] = useState("100%");
  const [height, setHeight] = useState("600");
  const [showBorder, setShowBorder] = useState(true);
  const [borderRadius, setBorderRadius] = useState("12");
  const [copied, setCopied] = useState(false);
  const [activePreset, setActivePreset] = useState(0);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://preview-territory-map-82312623.viktor.space";
  const embedUrl = `${baseUrl}/embed/${brandSlug}`;

  const widthAttr = width.includes("%") ? width : `${width}px`;
  const embedCode = `<iframe
  src="${embedUrl}"
  width="${widthAttr}"
  height="${height}px"
  style="border:${showBorder ? `1px solid ${brandColor || "#1e293b"}` : "none"};border-radius:${borderRadius}px;overflow:hidden;"
  title="${brandName} Territory Map — Powered by Franchise KI"
  loading="lazy"
  allow="geolocation"
></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePreset = (index: number) => {
    setActivePreset(index);
    setWidth(PRESET_SIZES[index].width);
    setHeight(PRESET_SIZES[index].height);
  };

  const accent = brandColor || "#06b6d4";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Code2 className="w-5 h-5" style={{ color: accent }} />
            Embed {brandName} Map
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Size Presets */}
          <div>
            <Label className="text-sm text-slate-400 mb-2 block">Size Preset</Label>
            <div className="flex gap-2">
              {PRESET_SIZES.map((preset, i) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.label}
                    onClick={() => handlePreset(i)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activePreset === i
                        ? "text-white shadow-lg"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                    }`}
                    style={activePreset === i ? { backgroundColor: accent } : undefined}
                  >
                    <Icon className="w-4 h-4" />
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Size */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-slate-400">Width</Label>
              <Input
                value={width}
                onChange={(e) => { setWidth(e.target.value); setActivePreset(-1); }}
                placeholder="100% or 800"
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
              <span className="text-xs text-slate-500 mt-1">Use % or px value</span>
            </div>
            <div>
              <Label className="text-sm text-slate-400">Height (px)</Label>
              <Input
                value={height}
                onChange={(e) => { setHeight(e.target.value); setActivePreset(-1); }}
                placeholder="600"
                className="bg-slate-800 border-slate-600 text-white mt-1"
              />
            </div>
          </div>

          {/* Style Options */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showBorder}
                onChange={(e) => setShowBorder(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-sm text-slate-300">Show border</span>
            </label>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-slate-400">Corner radius</Label>
              <Input
                value={borderRadius}
                onChange={(e) => setBorderRadius(e.target.value)}
                className="bg-slate-800 border-slate-600 text-white w-16 h-8 text-center"
              />
              <span className="text-xs text-slate-500">px</span>
            </div>
          </div>

          {/* Preview */}
          <div>
            <Label className="text-sm text-slate-400 mb-2 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Preview
            </Label>
            <div
              className="bg-slate-800 rounded-xl p-4 overflow-hidden"
              style={{ maxHeight: "250px" }}
            >
              <div
                style={{
                  width: width.includes("%") ? "100%" : `${Math.min(parseInt(width) || 480, 600)}px`,
                  height: `${Math.min(parseInt(height) || 300, 220)}px`,
                  border: showBorder ? `1px solid ${accent}` : "none",
                  borderRadius: `${borderRadius}px`,
                  overflow: "hidden",
                  margin: "0 auto",
                }}
              >
                <iframe
                  src={embedUrl}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  title="Preview"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          {/* Code Output */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm text-slate-400 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" /> Embed Code
              </Label>
              <Badge className="bg-slate-800 text-slate-400 border-0 text-[10px]">HTML</Badge>
            </div>
            <div className="relative">
              <pre className="bg-slate-950 border border-slate-700 rounded-xl p-4 text-xs text-cyan-300 overflow-x-auto font-mono whitespace-pre-wrap">
                {embedCode}
              </pre>
              <Button
                size="sm"
                onClick={handleCopy}
                className={`absolute top-2 right-2 ${
                  copied
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-slate-700 hover:bg-slate-600"
                } text-white`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Direct Link */}
          <div className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-3">
            <div>
              <span className="text-xs text-slate-400 block">Direct embed URL</span>
              <a
                href={embedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm hover:underline"
                style={{ color: accent }}
              >
                {embedUrl}
              </a>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => window.open(embedUrl, "_blank")}
            >
              <Eye className="w-3.5 h-3.5 mr-1" /> Open
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
