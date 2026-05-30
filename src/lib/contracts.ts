import type { Database } from "@/integrations/supabase/types";

export type Contract = Database["public"]["Tables"]["contracts"]["Row"];
export type ContractStatus = Database["public"]["Enums"]["contract_status"];
export type ContractAppendix = Database["public"]["Tables"]["contract_appendices"]["Row"];
export type ProjectFile = Database["public"]["Tables"]["files"]["Row"];

export const CONTRACT_STATUS_META: Record<ContractStatus, { label: string; color: string; dot: string }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
  sent: { label: "Sent", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", dot: "bg-amber-400" },
  signed: { label: "Signed", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
  declined: { label: "Declined", color: "bg-destructive/15 text-destructive border-destructive/30", dot: "bg-destructive" },
  void: { label: "Void", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
};

export const DEFAULT_CONTRACT_BODY = `# Statement of Work

**Project**: {{project}}
**Client**: {{client}}
**Freelancer**: {{freelancer}}
**Date**: {{date}}

## 1. Scope of Work
The Freelancer agrees to deliver the work described in the attached scope items. Any work outside this scope will be treated as a change request and may be subject to additional fees.

## 2. Timeline
Work will begin upon receipt of the signed agreement and any agreed deposit. Estimated delivery: {{deadline}}.

## 3. Compensation
Total compensation for the work described herein is {{amount}}. Payment is due as outlined in the attached invoice schedule.

## 4. Revisions
The Freelancer will provide up to two (2) rounds of revisions on deliverables. Additional revisions will be billed at the Freelancer's standard hourly rate.

## 5. Intellectual Property
Upon receipt of full payment, the Client receives ownership of the final deliverables. The Freelancer retains the right to display the work in their portfolio.

## 6. Confidentiality
Both parties agree to keep confidential information disclosed during this engagement private.

## 7. Termination
Either party may terminate this agreement with seven (7) days written notice. Work completed up to the date of termination will be billed.

## Signatures
By signing below, both parties agree to the terms of this agreement.`;

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
