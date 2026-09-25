import { buildArgs } from "./args.js";
import { CAP, resolveTool } from "./capabilities.js";
import { asUpstream, BadRequestError, nowIso } from "./errors.js";
import { pickNumber } from "./normalize.js";
import { callTool } from "./tools.js";
import type { FxResponse } from "./types.js";

const CODE = /^[A-Z]{3}$/;

export async function convert(params: { from?: string; to: string; amount?: string }): Promise<FxResponse> {
  const from = (params.from ?? "SGD").toUpperCase();
  const to = params.to.toUpperCase();
  const amount = params.amount === undefined ? 1 : Number(params.amount);
  if (!CODE.test(from) || !CODE.test(to)) throw new BadRequestError("from/to must be ISO-4217 codes, e.g. SGD and JPY");
  if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestError("amount must be a positive number");

  const tool = await resolveTool(CAP.fx);
  try {
    const args = buildArgs(tool, [
      { aliases: ["from", "from_currency", "fromCurrency", "base", "base_currency", "source", "source_currency", "src"], value: from },
      { aliases: ["to", "to_currency", "toCurrency", "target", "target_currency", "quote", "symbols", "dest", "destination_currency"], value: to },
      { aliases: ["amount", "value", "qty", "quantity"], value: amount },
    ]);
    const raw = await callTool(tool.name, args);
    let rate = pickNumber(raw, ["rate", "exchange_rate", "exchangeRate", "conversion_rate", "conversionRate", to, `${from}_${to}`, `${from}${to}`]);
    let converted = pickNumber(raw, ["converted", "converted_amount", "convertedAmount", "result", "conversion_result", "total", "output"]);
    if (converted === undefined && rate !== undefined) converted = round(amount * rate);
    if (rate === undefined && converted !== undefined && amount > 0) rate = converted / amount;
    if (typeof raw === "number") {
      // Some servers return the bare converted number.
      converted = converted ?? raw;
      rate = rate ?? raw / amount;
    }
    return { from, to, amount, rate, converted, source: tool.source, fetched_at: nowIso(), raw };
  } catch (err) {
    throw asUpstream(tool.source, err);
  }
}

const round = (n: number) => Math.round(n * 100) / 100;
