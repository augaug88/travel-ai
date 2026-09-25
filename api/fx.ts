import { convert } from "../lib/fx.js";
import { createHandler, query, requireQuery } from "../lib/http.js";

export default createHandler("GET", (req) => convert({ from: query(req, "from"), to: requireQuery(req, "to"), amount: query(req, "amount") }));
