import { getContext } from "hono/context-storage";
import { getGqlQuery, getGqlResult } from "../util";
import { CurrentWatching, Env } from "../types";

export default async function current_warching(type: "ANIME" | "MANGA") {
  const gqlQuery = await getGqlQuery("current_watching");
  const json: CurrentWatching = await getGqlResult(gqlQuery, {
    userId: getContext<Env>().var.user_id,
    status: "CURRENT",
    type,
  });

  return json.data;
}
