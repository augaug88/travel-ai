import { chat, validateMessages } from "../lib/chat.js";
import { createHandler } from "../lib/http.js";

export default createHandler("POST", (req) => chat(validateMessages(req.body)));
