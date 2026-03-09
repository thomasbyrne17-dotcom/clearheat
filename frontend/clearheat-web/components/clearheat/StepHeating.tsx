"use client";

import type { UseFormReturn } from "react-hook-form";
import type { ClearHeatInput } from "@/lib/schema";
import { BOILER_AGE_OPTIONS } from "@/lib/schema";

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

export default function StepHeating({ form }: { form: UseFormReturn<ClearHeatInput> }) {
  const { register, setValue, watch, formState } = form;

  const billMode = watch("bill_mode");
  const dhwSameFuel = watch("dhw_on_same_fuel");

  return (
    <div className="grid gap-4">

      {/* Fuel type + Fuel price */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2 min-w-0">
          <Label className="flex items-center">
            Fuel type
            <InfoTooltip text="The fuel your current boiler runs on. Kerosene is the most common home heating oil in Ireland. Gas refers to natural gas (mains supply)." />
          </Label>
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
          <Label className="flex items-center">
            Fuel price
            <InfoTooltip text="For kerosene: price per litre (typically €0.90–€1.20/L). For gas: price per kWh (typically €0.07–€0.12/kWh). Check your most recent bill for accuracy." />
          </Label>
          <Input
            className="w-full"
            type="number"
            step="0.01"
            placeholder={watch("fuel_type") === "gas" ? "e.g. 0.09" : "e.g. 1.05"}
            {...register("fuel_price_eur_per_unit")}
          />
          {formState.errors.fuel_price_eur_per_unit?.message && (
            <p className="text-sm text-destructive">
              {String(formState.errors.fuel_price_eur_per_unit.message)}
            </p>
          )}
        </div>
      </div>

      {/* Electricity price + Boiler age */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid gap-2 min-w-0">
          <Label className="flex items-center">
            Electricity price (€/kWh)
            <InfoTooltip text="Your current electricity unit rate in euro per kWh. In Ireland this is typically €0.28–€0.40/kWh. Check your electricity bill or your supplier's website." />
          </Label>
          <Input
            className="w-full"
            type="number"
            step="0.01"
            placeholder="e.g. 0.35"
            {...register("electricity_price_eur_per_kwh")}
          />
          {formState.errors.electricity_price_eur_per_kwh?.message && (
            <p className="text-sm text-destructive">
              {String(formState.errors.electricity_price_eur_per_kwh.message)}
            </p>
          )}
        </div>

        <div className="grid gap-2 min-w-0">
          <Label className="flex items-center">
            Boiler age
            <InfoTooltip text="Roughly when your current boiler was installed. Older boilers are less efficient — a 1990s boiler typically converts about 78% of fuel to heat, while a modern condensing boiler can reach 90–93%." />
          </Label>
          <Select
            value={watch("boiler_age") ?? ""}
            onValueChange={(v) => setValue("boiler_age", v as any)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select decade" />
            </SelectTrigger>
            <SelectContent>
              {BOILER_AGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formState.errors.boiler_age?.message && (
            <p className="text-sm text-destructive">
              {String(formState.errors.boiler_age.message)}
            </p>
          )}
        </div>
      </div>

      {/* Bill mode */}
      <div className="grid gap-2 min-w-0">
        <Label className="flex items-center">
          How would you like to enter your energy use?
          <InfoTooltip text="The most accurate option is your annual spend — the total you paid for heating fuel last year. If you know your consumption (litres of kerosene or kWh of gas), use that instead. If you're unsure of either, select 'None' and the model will estimate based on your BER and floor area." />
        </Label>
        <Select
          value={billMode}
          onValueChange={(v) => setValue("bill_mode", v as any)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="annual_spend">Annual spend (€)</SelectItem>
            <SelectItem value="annual_fuel_use">Annual fuel use (litres / kWh)</SelectItem>
            <SelectItem value="none">Not sure — estimate for me</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* DHW toggle */}
      {billMode !== "none" && (
        <div className="grid gap-2 min-w-0">
          <Label className="flex items-center">
            Does this bill include hot water?
            <InfoTooltip text="If your boiler heats both your radiators and your hot water (most Irish homes), select Yes. If you have a separate immersion or electric hot water system, select No." />
          </Label>
          <Select
            value={dhwSameFuel === false ? "no" : "yes"}
            onValueChange={(v) => setValue("dhw_on_same_fuel", v === "yes")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes — same system / fuel</SelectItem>
              <SelectItem value="no">No — hot water is separate</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {billMode === "annual_spend" && (
        <div className="grid gap-2 min-w-0">
          <Label className="flex items-center">
            Annual spend (€)
            <InfoTooltip text="The total amount you spent on your heating fuel last year, in euro. Include any wood or solid fuel spend if you selected 'Some' or 'Lots' for wood use. Check your bills or oil receipts." />
          </Label>
          <Input
            className="w-full"
            type="number"
            step="1"
            placeholder="e.g. 2400"
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
          <Label className="flex items-center">
            Annual fuel use
            <InfoTooltip text="For kerosene: total litres used per year (a typical Irish home uses 900–1,500 litres). For gas: total kWh per year (check your annual gas statement)." />
          </Label>
          <Input
            className="w-full"
            type="number"
            step="1"
            placeholder={watch("fuel_type") === "gas" ? "e.g. 12000 kWh" : "e.g. 1200 litres"}
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
          No problem — the model will estimate based on your BER band and floor area. Confidence may be lower.
        </p>
      )}

    </div>
  );
}
