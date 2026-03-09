import { z } from "zod";

// Convert form inputs (string/number/empty) into a proper number for z.number()
const asNumber = (v: unknown) => {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : v;
  }
  return v;
};

// Common numeric schema builder
const num = (min: number, max: number) =>
  z.preprocess(asNumber, z.number().min(min).max(max));

// Optional number
const numOpt = (min: number, max: number) =>
  z.preprocess(asNumber, z.number().min(min).max(max)).optional();

// Checkbox/boolean coercion
const bool = z.preprocess((v) => {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "on" || v === "1" || v === 1) return true;
  if (v === "false" || v === "off" || v === "0" || v === 0 || v == null || v === "") return false;
  return v;
}, z.boolean());

export const IRISH_COUNTIES = [
  "Carlow", "Cavan", "Clare", "Cork", "Donegal", "Dublin", "Galway",
  "Kerry", "Kildare", "Kilkenny", "Laois", "Leitrim", "Limerick",
  "Longford", "Louth", "Mayo", "Meath", "Monaghan", "Offaly",
  "Roscommon", "Sligo", "Tipperary", "Waterford", "Westmeath",
  "Wexford", "Wicklow",
] as const;

export type IrishCounty = typeof IRISH_COUNTIES[number];

export const HOUSE_TYPES = [
  { value: "detached", label: "Detached" },
  { value: "semi_d", label: "Semi-detached" },
  { value: "terrace", label: "Terraced" },
  { value: "apartment", label: "Apartment" },
] as const;

export const clearHeatSchema = z
  .object({
    // Lead qualification fields (not used by engine)
    county: z.enum(IRISH_COUNTIES).optional(),
    house_type: z.enum(["detached", "semi_d", "terrace", "apartment"]).optional(),

    ber_band: z.enum(["A", "B", "C", "D", "E", "F", "G"]),

    floor_area_m2: num(20, 1000),

    emitters: z.enum(["radiators", "ufh"]),

    // V2: flow temperature proxy (optional; engine defaults to medium for radiators, high for UFH)
    flow_temp_capability: z.enum(["low", "medium", "high"]).optional(),

    heating_pattern: z.enum(["rare", "normal", "high"]),
    wood_use: z.enum(["none", "some", "lots"]),
    occupants: z.preprocess(asNumber, z.number().int().min(1).max(20)),

    fuel_type: z.enum(["gas", "kerosene"]),
    fuel_price_eur_per_unit: num(0, 10),
    electricity_price_eur_per_kwh: num(0, 10),
    // Replaces boiler_efficiency — converted to efficiency value before sending to engine
    boiler_age: z.enum(["pre_1980", "1980s", "1990s", "2000s", "2010s", "2020s"]),

    hp_quote_eur: num(0, 200000),
    grant_applied: bool,
    grant_value_eur: num(0, 50000),

    bill_mode: z.enum(["annual_fuel_use", "annual_spend", "none"]),

    annual_fuel_use: numOpt(0, 500000),
    annual_spend_eur: numOpt(0, 200000),

    // V2: does annual bill include DHW? (optional; engine defaults True)
    dhw_on_same_fuel: bool.optional(),
  })
  .superRefine((v, ctx) => {
    if (v.bill_mode === "annual_fuel_use" && v.annual_fuel_use == null) {
      ctx.addIssue({
        code: "custom",
        path: ["annual_fuel_use"],
        message: "Required when bill_mode is annual_fuel_use",
      });
    }
    if (v.bill_mode === "annual_spend" && v.annual_spend_eur == null) {
      ctx.addIssue({
        code: "custom",
        path: ["annual_spend_eur"],
        message: "Required when bill_mode is annual_spend",
      });
    }
  });

export type ClearHeatInput = z.infer<typeof clearHeatSchema>;

// Maps boiler age bracket to efficiency value sent to the engine
export const BOILER_AGE_TO_EFFICIENCY: Record<string, number> = {
  pre_1980: 0.65,
  "1980s":  0.72,
  "1990s":  0.78,
  "2000s":  0.84,
  "2010s":  0.90,
  "2020s":  0.93,
};

export const BOILER_AGE_OPTIONS = [
  { value: "pre_1980", label: "Before 1980" },
  { value: "1980s",    label: "1980s" },
  { value: "1990s",    label: "1990s" },
  { value: "2000s",    label: "2000s" },
  { value: "2010s",    label: "2010s" },
  { value: "2020s",    label: "2020 or newer" },
];