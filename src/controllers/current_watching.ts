import { getContext } from "hono/context-storage";
import { getGqlQuery, getGqlResult } from "../util";

export default async function current_warching() {
  const gqlQuery = await getGqlQuery("current_watching");
  const json: CurrentWatching = await getGqlResult(gqlQuery, {
    userId: getContext<Env>().var.user_id,
    status: "CURRENT",
    type: "ANIME",
  });

  return json.data;
}
