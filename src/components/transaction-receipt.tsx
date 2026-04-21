import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, Share2, Shield, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/currency";
import { toast } from "sonner";
import { useRef } from "react";

export interface ReceiptLine {
  label: string;
  value: string;
}

export interface ReceiptProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  status?: "success" | "pending";
  amount: number;
  currency: string;
  reference: string;
  date?: Date;
  lines: ReceiptLine[];
  note?: string;
}

export function TransactionReceipt({
  open,
  onClose,
  title = "Transaction Successful",
  status = "success",
  amount,
  currency,
  reference,
  date = new Date(),
  lines,
  note,
}: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const copyRef = () => {
    navigator.clipboard.writeText(reference);
    toast.success("Reference copied");
  };

  const share = async () => {
    const text = `Capital Crest Receipt\n${title}\nAmount: ${formatCurrency(amount, currency)}\nRef: ${reference}\n${date.toLocaleString()}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Capital Crest Receipt", text }); } catch {}
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Receipt copied to clipboard");
    }
  };

  const download = () => {
    const html = receiptRef.current?.outerHTML;
    if (!html) return;
    const doc = `<!doctype html><html><head><meta charset="utf-8"><title>Capital Crest Receipt — ${reference}</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#0b1220;margin:0;padding:24px;display:flex;justify-content:center}
.r{background:#fff;color:#0b1220;max-width:380px;width:100%;border-radius:16px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.r h1{font-size:18px;margin:0 0 4px;text-align:center}
.r .amt{font-size:32px;font-weight:800;text-align:center;margin:12px 0}
.r .row{display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px dashed #e5e7eb}
.r .row:last-child{border:none}
.r .lbl{color:#64748b}.r .val{font-weight:600;text-align:right;max-width:60%;word-break:break-all}
.r .ok{color:#10b981;text-align:center;font-weight:700;margin-bottom:8px}
.r .ftr{margin-top:18px;text-align:center;font-size:11px;color:#94a3b8}
</style></head><body><div class="r"><div class="ok">✓ ${title}</div>
<div class="amt">${formatCurrency(amount, currency)}</div>
${lines.map(l => `<div class="row"><span class="lbl">${l.label}</span><span class="val">${l.value}</span></div>`).join("")}
<div class="row"><span class="lbl">Reference</span><span class="val">${reference}</span></div>
<div class="row"><span class="lbl">Date</span><span class="val">${date.toLocaleString()}</span></div>
<div class="ftr">Capital Crest Banking · This is an electronically generated receipt.</div></div></body></html>`;
    const blob = new Blob([doc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `capital-crest-receipt-${reference.slice(0, 8)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[360px] gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none">
        <motion.div
          ref={receiptRef}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 18, stiffness: 220 }}
          className="relative overflow-hidden rounded-2xl bg-card shadow-2xl"
          style={{
            backgroundImage:
              "radial-gradient(circle at top left, color-mix(in oklab, var(--primary) 8%, transparent), transparent 60%)",
          }}
        >
          {/* Top notch / perforated edge */}
          <div className="flex h-3 w-full">
            {Array.from({ length: 22 }).map((_, i) => (
              <div key={i} className="flex-1 border-r border-dashed border-border last:border-0" />
            ))}
          </div>

          <div className="px-6 pb-2 pt-4 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 260 }}
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
                status === "success" ? "bg-emerald/15 text-emerald" : "bg-chart-4/15 text-chart-4"
              }`}
            >
              <CheckCircle2 className="h-8 w-8" strokeWidth={2.4} />
            </motion.div>
            <p className="mt-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {status === "success" ? "Payment Successful" : "Submitted"}
            </p>
            <h2 className="mt-1 text-base font-semibold text-foreground">{title}</h2>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {formatCurrency(amount, currency)}
            </p>
          </div>

          {/* Perforated divider */}
          <div className="relative my-2 flex items-center px-3">
            <div className="absolute -left-3 h-6 w-6 rounded-full bg-background" />
            <div className="absolute -right-3 h-6 w-6 rounded-full bg-background" />
            <div className="flex-1 border-t-2 border-dashed border-border" />
          </div>

          <div className="space-y-2.5 px-6 py-3 text-xs">
            {lines.map((l, i) => (
              <div key={i} className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">{l.label}</span>
                <span className="max-w-[60%] break-all text-right font-medium text-foreground">
                  {l.value}
                </span>
              </div>
            ))}
            <div className="flex items-start justify-between gap-3 border-t border-dashed border-border pt-2.5">
              <span className="text-muted-foreground">Reference</span>
              <button
                onClick={copyRef}
                className="flex max-w-[60%] items-center gap-1 break-all text-right font-mono text-[11px] font-medium text-foreground hover:text-primary"
              >
                <span className="break-all">{reference}</span>
                <Copy className="h-3 w-3 shrink-0" />
              </button>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-muted-foreground">Date & Time</span>
              <span className="text-right font-medium text-foreground">
                {date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
            {note && (
              <div className="rounded-lg bg-muted/50 p-2 text-[11px] text-muted-foreground">
                {note}
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-1.5 border-t border-dashed border-border px-6 py-3 text-[10px] text-muted-foreground">
            <Shield className="h-3 w-3 text-primary" />
            <span>Capital Crest Banking · Secured & Encrypted</span>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-muted/30 p-3">
            <Button variant="outline" size="sm" onClick={share} className="gap-1.5">
              <Share2 className="h-3.5 w-3.5" /> Share
            </Button>
            <Button size="sm" onClick={download} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
          </div>

          {/* Bottom notch */}
          <div className="flex h-3 w-full">
            {Array.from({ length: 22 }).map((_, i) => (
              <div key={i} className="flex-1 border-r border-dashed border-border last:border-0" />
            ))}
          </div>
        </motion.div>

        <Button
          variant="ghost"
          onClick={onClose}
          className="mt-3 w-full text-primary-foreground hover:bg-white/10"
        >
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
}