import fs from "node:fs/promises";
import { Anilist } from "./anilist_options";
import { getContext } from "hono/context-storage";
import ky from "ky";
import ejs from "ejs";

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
 * @returns result in json
 */
export const getGqlResult = async <T>(
  query: string,
  variables: Record<string, number | string>
) => {
  return await ky
    .post<T>(Anilist.resourceUrl, {
      headers: {
        Authorization: `Bearer ${getContext<Env>().var.anilist_token}`,
      },
      json: {
        query,
        variables,
      },
    })
    .json();
};

/**
 * Get the rendered HTML (view) from the ejs file.
 * @param viewPath path of the view file
 * @param variables data to be used in the view file
 * @returns html string
 */
export const getView = async (
  viewPath: string,
  variables: Record<string, unknown> = {}
) => {
  const ejsString = (
    await fs.readFile(`src/resources/view/${viewPath}.ejs`)
  ).toString();
  const renderedHTML = ejs.render(ejsString, variables);
  return renderedHTML;
};
