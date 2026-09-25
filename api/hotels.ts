import { searchHotels } from "../lib/hotels.js";
import { createHandler, requireQuery } from "../lib/http.js";

export default createHandler("GET", (req) =>
  searchHotels({ city: requireQuery(req, "city"), checkin: requireQuery(req, "checkin"), checkout: requireQuery(req, "checkout") }),
);
