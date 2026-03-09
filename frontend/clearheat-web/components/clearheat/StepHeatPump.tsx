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
import InfoTooltip from "./InfoTooltip";

export default function StepHeatPump({ form }: { form: UseFormReturn<ClearHeatInput> }) {
  const { register, setValue, watch, formState } = form;

  const grantApplied = watch("grant_applied");
  const emitters = watch("emitters");
  const flowTemp = watch("flow_temp_capability");

  return (
    <div className="grid gap-4">

      {/* Emitters + Quote */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2 min-w-0">
          <Label className="flex items-center">
            Heat distribution system
            <InfoTooltip text="How heat is distributed around your home. Underfloor heating (UFH) works at low temperatures and is ideal for heat pumps. Radiators can work well too, but efficiency depends on their size and the house's insulation level." />
          </Label>
          <Select
            value={emitters}
            onValueChange={(v) => {
              const next = v as any;
              setValue("emitters", next);
              if (next === "ufh") setValue("flow_temp_capability", "high" as any);
              if (next === "radiators" && !flowTemp)
                setValue("flow_temp_capability", "medium" as any);
            }}
          >
            <SelectTrigger className="w-full min-w-0 overflow-hidden">
              <SelectValue className="truncate" placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="radiators">Radiators</SelectItem>
              <SelectItem value="ufh">Underfloor heating</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2 min-w-0">
          <Label className="flex items-center">
            Heat pump quote (€)
            <InfoTooltip text="The total installed cost quoted by an installer, before any SEAI grant is applied. A typical air-to-water heat pump installation in Ireland costs €12,000–€18,000 before grant. If you don't have a quote yet, use €14,000 as a rough estimate." />
          </Label>
          <Input
            className="w-full"
            type="number"
            step="100"
            placeholder="e.g. 14000"
            {...register("hp_quote_eur")}
          />
          {formState.errors.hp_quote_eur?.message && (
            <p className="text-sm text-destructive">
              {String(formState.errors.hp_quote_eur.message)}
            </p>
          )}
        </div>
      </div>

      {/* Flow temperature — radiators only */}
      {emitters === "radiators" && (
        <div className="grid gap-2 min-w-0">
          <Label className="flex items-center">
            Radiator system suitability
            <InfoTooltip text="Heat pumps work best at lower flow temperatures (≤45°C). If your radiators are large or your house is well insulated, they can usually achieve this. Smaller radiators in a less insulated house may need higher temperatures, which reduces efficiency and increases running costs." />
          </Label>
          <Select
            value={flowTemp ?? "medium"}
            onValueChange={(v) => setValue("flow_temp_capability", v as any)}
          >
            <SelectTrigger className="w-full min-w-0 overflow-hidden">
              <SelectValue className="truncate" placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">
                Likely OK at ≤45°C (oversized rads / well-insulated)
              </SelectItem>
              <SelectItem value="medium">Not sure / typical</SelectItem>
              <SelectItem value="low">
                Likely needs &gt;50°C (small rads / older house)
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            This affects expected efficiency (SCOP) and payback.
          </p>
        </div>
      )}

      {/* Grant */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2 min-w-0">
          <Label className="flex items-center">
            Applying for SEAI grant?
            <InfoTooltip text="SEAI (Sustainable Energy Authority of Ireland) offers grants of up to €6,500 for heat pump installations. Most homeowners qualify if the house was built before 2011. See seai.ie for eligibility details." />
          </Label>
          <Select
            value={String(grantApplied)}
            onValueChange={(v) => setValue("grant_applied", v === "true")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {grantApplied && (
          <div className="grid gap-2 min-w-0">
            <Label className="flex items-center">
              Grant value (€)
              <InfoTooltip text="The SEAI heat pump grant is currently up to €6,500 for an air-to-water heat pump. Leave at €6,500 if you're unsure — your installer can confirm the exact amount." />
            </Label>
            <Input
              className="w-full"
              type="number"
              step="100"
              placeholder="e.g. 6500"
              {...register("grant_value_eur")}
            />
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
