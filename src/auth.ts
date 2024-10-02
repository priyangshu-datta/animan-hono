import { getSignedCookie, setSignedCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import {
  Anilist,
  anilistCookieName,
  cookieSecret,
  tokenRequestBody,
} from "./anilist_options";
import { protectedRoutes } from "./routes";
import { Hono } from "hono";
import dayjs from "dayjs";
import { html } from "hono/html";
import ky from "ky";
import { getGqlQuery } from "./util";

export const OAuthMiddleware = createMiddleware(async (c, next) => {
  if (protectedRoutes.includes(c.req.path)) {
    const anilistUser = await getSignedCookie(
      c,
      cookieSecret,
      anilistCookieName
    );

    if (!anilistUser) {
      // TODO: implement a storage to make the following unique for each connection. You can delete from storage once auth is done
      process.env["PAUSED_URL"] = c.req.path;
      return c.redirect("/auth");
    } else {
      const [token, id, name, avatar] = anilistUser.split(";");
      c.set("anilist_token", token);
      c.set("user_id", parseInt(id));
      c.set("name", name);
      c.set("avatar", avatar);
    }
  }
  await next();
});

export const anilistOAuth = new Hono();

anilistOAuth.get("/", async (c) => {
  const anilistToken = await getSignedCookie(
    c,
    cookieSecret,
    anilistCookieName
  );

  if (anilistToken) {
    return c.redirect("/home");
  }

  return c.redirect(Anilist.authorizeUrl);
});

anilistOAuth.get("/callback", async (c) => {
  const [code, ..._rest] = c.req.queries("code") ?? [];
  const token_json = await ky
    .post<AnilistTokenResponse>(Anilist.tokenUrl, {
      json: tokenRequestBody(code),
    })
    .json();

  const user_json = await ky
    .post<AnilistUser>(Anilist.resourceUrl, {
      headers: {
        Authorization: `Bearer ${token_json.access_token}`,
      },
      json: {
        query: await getGqlQuery("user"),
      },
    })
    .json();

  await setSignedCookie(
    c,
    anilistCookieName,
    `${token_json.access_token};${user_json.data.Viewer.id};${user_json.data.Viewer.name};${user_json.data.Viewer.avatar.medium}`,
    cookieSecret,
    {
      httpOnly: true,
      expires: dayjs().add(2, "d").toDate(),
      secure: true,
      path: "/",
      sameSite: "Strict",
    }
  );

  return c.html(
    html`<!DOCTYPE html>
      <html>
        <head>
          <script>
            window.location = "${process.env["PAUSED_URL"] ?? "/home"}";
          </script>
        </head>
        <body
          style="display: grid; height: 100dvh; width: 100dvw; place-items: center;"
        >
          <img src="loading_ripple.svg" />
        </body>
      </html>`
  );
});
