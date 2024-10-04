import fs from "node:fs/promises";
import { Anilist } from "../anilist_options";
import { getContext } from "hono/context-storage";
import ky from "ky";
import { Env } from "../types";
import { viewEngine } from "./helper";

/**
 * Get the GraphQL queries from disk.
 * @param filePath prefixed with `src/gql/`. Do not include the file extension.
 */
export const getGqlQuery = async (filePath: string) => {
  return (await fs.readFile(`src/resources/gql/${filePath}.gql`)).toString();
};

/**
 * Get the result from Anilist for the given GQL query.
 * @param query GraphQL query string
 * @param variables GraphQL variables in quey string
 * @param access_token Anilist access_token (optional), here for development
 * @returns result in json
 */
export const getGqlResult = async <T>(
  query: string,
  variables: Record<string, number | string>,
  access_token: undefined | string = undefined
) => {
  return await ky
    .post<T>(Anilist.resourceUrl, {
      headers: {
        Authorization: `Bearer ${
          access_token ?? getContext<Env>().var.anilist_token
        }`,
      },
      json: {
        query,
        variables,
      },
    })
    .json();
};

/**
 * Get the rendered HTML (view) from the liquid file.
 * @param viewPath path of the view file
 * @param variables data to be used in the view file
 * @returns html string
 */
export const getView = async (
  viewPath: string,
  variables: Record<string, unknown> = {}
) => {
  const engine = viewEngine();
  return await engine.renderFile(viewPath, variables);
};
