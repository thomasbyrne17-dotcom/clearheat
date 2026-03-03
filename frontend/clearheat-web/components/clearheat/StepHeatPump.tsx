"use client";

import type { UseFormReturn } from "react-hook-form";
import type { ClearHeatInput } from "@/lib/schema";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function StepHeatPump({
  form,
}: {
  form: UseFormReturn<ClearHeatInput>;
}) {
  const { register, setValue, watch, formState } = form;

  const grantApplied = watch("grant_applied");
  const emitters = watch("emitters");
  const flowTemp = watch("flow_temp_capability");

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Emitters</Label>
          <Select
            value={emitters}
            onValueChange={(v) => {
              const next = v as any;
              setValue("emitters", next);

              // V2: set a sensible default for flow temp capability when emitters change
              // UFH usually supports low flow temps → "high" capability in our proxy language
              if (next === "ufh") setValue("flow_temp_capability", "high" as any);
              // Radiators default to "medium" unless user selects otherwise
              if (next === "radiators" && !flowTemp) setValue("flow_temp_capability", "medium" as any);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="radiators">Radiators</SelectItem>
              <SelectItem value="ufh">Underfloor heating</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Heat pump quote (€)</Label>
          <Input type="number" step="100" {...register("hp_quote_eur")} />
          {formState.errors.hp_quote_eur?.message && (
            <p className="text-sm text-destructive">
              {String(formState.errors.hp_quote_eur.message)}
            </p>
          )}
        </div>
      </div>

      {/* V2: Flow temperature proxy (only show for radiators) */}
      {emitters === "radiators" && (
        <div className="grid gap-2">
          <Label>Radiator system suitability (flow temperature)</Label>
          <Select
            value={flowTemp ?? "medium"}
            onValueChange={(v) => setValue("flow_temp_capability", v as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">Likely OK at ≤45°C (oversized / well-insulated)</SelectItem>
              <SelectItem value="medium">Not sure / typical</SelectItem>
              <SelectItem value="low">Likely needs &gt;50°C (small rads / colder house)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            This affects expected efficiency (SCOP) and payback.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Grant applied?</Label>
          <Select
            value={String(grantApplied)}
            onValueChange={(v) => setValue("grant_applied", v === "true")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {grantApplied && (
          <div className="grid gap-2">
            <Label>Grant value (€)</Label>
            <Input type="number" step="100" {...register("grant_value_eur")} />
            {formState.errors.grant_value_eur?.message && (
              <p className="text-sm text-destructive">
                {String(formState.errors.grant_value_eur.message)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}