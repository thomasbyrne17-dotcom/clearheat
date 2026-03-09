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

export default function StepHeating({
  form,
}: {
  form: UseFormReturn<ClearHeatInput>;
}) {
  const { register, setValue, watch, formState } = form;

  const billMode = watch("bill_mode");
  const dhwSameFuel = watch("dhw_on_same_fuel");

  return (
    <div className="grid gap-4">
      {/* Row 1: 2 cols on desktop, 1 col on mobile */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2 min-w-0">
          <Label>Fuel type</Label>
          <Select
            value={watch("fuel_type")}
            onValueChange={(v) => setValue("fuel_type", v as any)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gas">Gas</SelectItem>
              <SelectItem value="kerosene">Kerosene</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2 min-w-0">
          <Label>Fuel price (Kerosene-€/L, Gas-€/kWh)</Label>
          <Input
            className="w-full"
            type="number"
            step="0.01"
            {...register("fuel_price_eur_per_unit")}
          />
          {formState.errors.fuel_price_eur_per_unit?.message && (
            <p className="text-sm text-destructive">
              {String(formState.errors.fuel_price_eur_per_unit.message)}
            </p>
          )}
        </div>
      </div>

      {/* Row 2: 3 cols on desktop, 1 col on mobile */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="grid gap-2 min-w-0">
          <Label>Electricity price (€/kWh)</Label>
          <Input
            className="w-full"
            type="number"
            step="0.01"
            {...register("electricity_price_eur_per_kwh")}
          />
          {formState.errors.electricity_price_eur_per_kwh?.message && (
            <p className="text-sm text-destructive">
              {String(formState.errors.electricity_price_eur_per_kwh.message)}
            </p>
          )}
        </div>

        <div className="grid gap-2 min-w-0">
          <Label>Boiler efficiency</Label>
          <Input
            className="w-full"
            type="number"
            step="0.01"
            {...register("boiler_efficiency")}
          />
          {formState.errors.boiler_efficiency?.message && (
            <p className="text-sm text-destructive">
              {String(formState.errors.boiler_efficiency.message)}
            </p>
          )}
        </div>

        <div className="grid gap-2 min-w-0">
          <Label>Bill input mode</Label>
          <Select
            value={billMode}
            onValueChange={(v) => setValue("bill_mode", v as any)}
          >
            <SelectTrigger className="w-full">
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

      {/* V2: DHW linkage toggle (only relevant when bills are used) */}
      {billMode !== "none" && (
        <div className="grid gap-2 min-w-0">
          <Label>Does this bill include hot water?</Label>
          <Select
            value={dhwSameFuel === false ? "no" : "yes"}
            onValueChange={(v) => setValue("dhw_on_same_fuel", v === "yes")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes — same system/fuel</SelectItem>
              <SelectItem value="no">No — hot water is separate</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            This improves accuracy for bills-based estimates.
          </p>
        </div>
      )}

      {billMode === "annual_spend" && (
        <div className="grid gap-2 min-w-0">
          <Label>Annual spend (€) (Include wood spend if used)</Label>
          <Input
            className="w-full"
            type="number"
            step="1"
            {...register("annual_spend_eur")}
          />
          {formState.errors.annual_spend_eur?.message && (
            <p className="text-sm text-destructive">
              {String(formState.errors.annual_spend_eur.message)}
            </p>
          )}
        </div>
      )}

      {billMode === "annual_fuel_use" && (
        <div className="grid gap-2 min-w-0">
          <Label>Annual fuel use (Kerosene-Litres, Gas-kWh)</Label>
          <Input
            className="w-full"
            type="number"
            step="1"
            {...register("annual_fuel_use")}
          />
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