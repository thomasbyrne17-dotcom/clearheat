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

export default function StepHeating({ form }: { form: UseFormReturn<ClearHeatInput> }) {
  const { register, setValue, watch, formState } = form;

  const billMode = watch("bill_mode");

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Fuel type</Label>
          <Select
            value={watch("fuel_type")}
            onValueChange={(v) => setValue("fuel_type", v as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gas">Gas</SelectItem>
              <SelectItem value="kerosene">Kerosene</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Fuel price (€/unit)</Label>
          <Input type="number" step="0.01" {...register("fuel_price_eur_per_unit")} />
          {formState.errors.fuel_price_eur_per_unit?.message && (
            <p className="text-sm text-destructive">
              {String(formState.errors.fuel_price_eur_per_unit.message)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Unit depends on fuel type (your backend defines “unit”).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label>Electricity price (€/kWh)</Label>
          <Input type="number" step="0.01" {...register("electricity_price_eur_per_kwh")} />
          {formState.errors.electricity_price_eur_per_kwh?.message && (
            <p className="text-sm text-destructive">
              {String(formState.errors.electricity_price_eur_per_kwh.message)}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label>Boiler efficiency</Label>
          <Input type="number" step="0.01" {...register("boiler_efficiency")} />
          {formState.errors.boiler_efficiency?.message && (
            <p className="text-sm text-destructive">
              {String(formState.errors.boiler_efficiency.message)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">0.50 – 1.00</p>
        </div>

        <div className="grid gap-2">
          <Label>Bill input mode</Label>
          <Select value={billMode} onValueChange={(v) => setValue("bill_mode", v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="annual_spend">Annual spend</SelectItem>
              <SelectItem value="annual_fuel_use">Annual fuel use</SelectItem>
              <SelectItem value="none">None / unsure</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {billMode === "annual_spend" && (
        <div className="grid gap-2">
          <Label>Annual spend (€)</Label>
          <Input type="number" step="1" {...register("annual_spend_eur")} />
          {formState.errors.annual_spend_eur?.message && (
            <p className="text-sm text-destructive">
              {String(formState.errors.annual_spend_eur.message)}
            </p>
          )}
        </div>
      )}

      {billMode === "annual_fuel_use" && (
        <div className="grid gap-2">
          <Label>Annual fuel use (units)</Label>
          <Input type="number" step="1" {...register("annual_fuel_use")} />
          {formState.errors.annual_fuel_use?.message && (
            <p className="text-sm text-destructive">
              {String(formState.errors.annual_fuel_use.message)}
            </p>
          )}
        </div>
      )}

      {billMode === "none" && (
        <p className="text-sm text-muted-foreground">
          No problem — confidence may be lower without bills.
        </p>
      )}
    </div>
  );
}
