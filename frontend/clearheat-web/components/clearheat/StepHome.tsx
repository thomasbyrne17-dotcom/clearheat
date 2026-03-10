"use client";

import type { UseFormReturn } from "react-hook-form";
import type { ClearHeatInput } from "@/lib/schema";
import { IRISH_COUNTIES, HOUSE_TYPES } from "@/lib/schema";

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

export default function StepHome({ form }: { form: UseFormReturn<ClearHeatInput> }) {
  const { register, setValue, watch, formState } = form;

  return (
    <div className="grid gap-4">

      {/* County + House type */}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label className="flex items-center">
            County
            <InfoTooltip text="Your county helps us match you with installers and assessors in your area. It does not affect the financial calculation." />
          </Label>
          <Select
            value={watch("county") ?? ""}
            onValueChange={(v) => setValue("county", v as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select county" />
            </SelectTrigger>
            <SelectContent>
              {IRISH_COUNTIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label className="flex items-center">
            House type
            <InfoTooltip text="The type of property you live in. Apartments are rarely suitable for heat pumps due to shared systems and planning restrictions." />
          </Label>
          <Select
            value={watch("house_type") ?? ""}
            onValueChange={(v) => setValue("house_type", v as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {HOUSE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* BER + Floor area */}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label className="flex items-center">
            BER band
            <InfoTooltip text="Your Building Energy Rating (BER) — found on your BER certificate or property listing. It runs from A (most efficient) to G (least efficient). A typical Irish semi-detached house is C or D." />
          </Label>
          <Select
            value={watch("ber_band")}
            onValueChange={(v) => setValue("ber_band", v as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {["A", "B", "C", "D", "E", "F", "G"].map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label className="flex items-center">
            Floor area (m²)
            <InfoTooltip text="The total heated floor area of your home in square metres. For a typical Irish semi-detached house this is roughly 90–130 m²." />
          </Label>
          <Input type="number" {...register("floor_area_m2")} />
          {formState.errors.floor_area_m2?.message && (
            <p className="text-sm text-destructive">
              {String(formState.errors.floor_area_m2.message)}
            </p>
          )}
        </div>
      </div>

      {/* Occupants + Heating pattern + Wood use */}
      <div className="grid grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label className="flex items-center">
            Occupants
            <InfoTooltip text="The number of people living in the house. This affects how much hot water the model assumes is used." />
          </Label>
          <Input type="number" {...register("occupants")} />
          {formState.errors.occupants?.message && (
            <p className="text-sm text-destructive">
              {String(formState.errors.occupants.message)}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label className="flex items-center">
            Heating pattern
            <InfoTooltip text="How heavily you heat your home. 'Rare' means occasional or partial heating. 'Normal' is a typical Irish household. 'High' means you keep the house warm most of the time." />
          </Label>
          <Select
            value={watch("heating_pattern")}
            onValueChange={(v) => setValue("heating_pattern", v as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rare">Rare</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label className="flex items-center">
            Wood / stove use
            <InfoTooltip text="Whether you supplement your main heating with a wood stove or solid fuel. This reduces how much your primary heating system is used, which affects the comparison." />
          </Label>
          <Select
            value={watch("wood_use")}
            onValueChange={(v) => setValue("wood_use", v as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="some">Some</SelectItem>
              <SelectItem value="lots">Lots</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

    </div>
  );
}
