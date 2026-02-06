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

export default function StepHome({ form }: { form: UseFormReturn<ClearHeatInput> }) {
  const { register, setValue, watch, formState } = form;

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>BER band</Label>
          <Select
            value={watch("ber_band")}
            onValueChange={(v) => setValue("ber_band", v as any)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {["A", "B", "C", "D", "E", "F", "G"].map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Floor area (m²)</Label>
          <Input type="number" {...register("floor_area_m2")} />
          {formState.errors.floor_area_m2?.message && (
            <p className="text-sm text-destructive">
              {String(formState.errors.floor_area_m2.message)}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label>Occupants</Label>
          <Input type="number" {...register("occupants")} />
          {formState.errors.occupants?.message && (
            <p className="text-sm text-destructive">
              {String(formState.errors.occupants.message)}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <Label>Heating pattern</Label>
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
          <Label>Wood / stove use</Label>
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
