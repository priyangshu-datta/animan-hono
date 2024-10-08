import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { html } from "hono/html";
import { deleteCookie, getSignedCookie } from "hono/cookie";
import { contextStorage, getContext } from "hono/context-storage";
import { anilistCookieName, cookieSecret } from "./anilist_options";
import { OAuthMiddleware, anilistOAuth } from "./auth";
import fs from "node:fs/promises";
import current_warching from "./controllers/current_watching";
import { getView } from "./util";
import { serveStatic } from "hono/serve-static";
import { stream } from "hono/streaming";
import { CurrentWatching, Env } from "./types";
import { HTTPException } from "hono/http-exception";

const app = new Hono<Env>();
app.use(contextStorage());
app.use(
  "/static/*",
  serveStatic({
    getContent: async (path, c) => {
      return stream(c, async (stream) => {
        await stream.write(await fs.readFile(path));
      });
    },
    rewriteRequestPath: (path) =>
      path.replace(/^\/static/, "/src/resources/public"),
  })
);
app.use(OAuthMiddleware);
app.route("/auth", anilistOAuth);

app.get("/", async (c) => {
  const anilistToken = await getSignedCookie(
    c,
    cookieSecret,
    anilistCookieName
  );

  if (anilistToken) {
    return c.redirect("/home");
  }

  return c.html(getView("root"));
});

app.get("/current", async (c) => {
  const type = c.req.query("type");
  if (type !== "ANIME" && type !== "MANGA") {
    throw new HTTPException(400, {
      cause: "@param type error",
      message: "type can be either ANIME or MANGA",
    });
  }

  const data: CurrentWatching["data"] = await current_warching(type);
  return c.html(html`${JSON.stringify(data, null, 4)}`);
});

app.get("/home", async (c) => {
  const animeData: CurrentWatching["data"] = await current_warching("ANIME");
  const mangaData: CurrentWatching["data"] = await current_warching("MANGA");
  return c.html(
    getView("home", {
      name: getContext<Env>().var.name,
      id: getContext<Env>().var.user_id,
      avatar: getContext<Env>().var.avatar,
      current: { anime: animeData, manga: mangaData },
    })
  );
});

app.post("/logout", (c) => {
  deleteCookie(c, anilistCookieName);
  return c.redirect("/");
});

const port = 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
