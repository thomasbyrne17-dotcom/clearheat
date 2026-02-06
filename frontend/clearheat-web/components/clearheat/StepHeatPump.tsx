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

export default function StepHeatPump({ form }: { form: UseFormReturn<ClearHeatInput> }) {
  const { register, setValue, watch, formState } = form;

  const grantApplied = watch("grant_applied");

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Emitters</Label>
          <Select value={watch("emitters")} onValueChange={(v) => setValue("emitters", v as any)}>
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
