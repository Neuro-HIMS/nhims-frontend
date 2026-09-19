"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { feedbackService } from "@/services/feedback.service";
import { notify } from "@/lib/notify";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const pathname = usePathname();
  const [message, setMessage] = useState("");
  const [includePage, setIncludePage] = useState(true);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!message.trim()) {
      notify.error("Tell us a little about what you noticed before sending.");
      return;
    }
    setSending(true);
    try {
      await feedbackService.submit({
        message: message.trim(),
        pageUrl: includePage ? pathname : undefined,
      });
      notify.success("Thanks — your feedback was sent.");
      setMessage("");
      onOpenChange(false);
    } catch {
      notify.error("We couldn't send your feedback. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Feedback</DialogTitle>
          <DialogDescription>Tell us what&apos;s working and what isn&apos;t.</DialogDescription>
        </DialogHeader>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. The waiting list is slow to update after I record vitals."
          rows={5}
          disabled={sending}
        />

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={includePage} onCheckedChange={(v) => setIncludePage(v === true)} disabled={sending} />
          Include this page&apos;s address
        </label>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSend()} disabled={sending}>
            {sending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            Send feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
