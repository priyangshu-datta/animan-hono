import { getSignedCookie, setSignedCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import {
  Anilist,
  anilistCookieName,
  cookieSecret,
  tokenRequestBody,
} from "./anilist_options";
import { protectedRoutes } from "./routes";
import { Context, Hono } from "hono";
import dayjs from "dayjs";
import { html } from "hono/html";
import ky from "ky";
import { getGqlQuery, getGqlResult } from "./util";
import { AnilistTokenResponse, AnilistUser, Env } from "./types";

const urlStateBeforeAuth: Map<string, string> = new Map();

export const OAuthMiddleware = createMiddleware(
  async (c: Context<Env>, next) => {
    if (protectedRoutes.includes(c.req.path)) {
      const anilistUser = await getSignedCookie(
        c,
        cookieSecret,
        anilistCookieName
      );

      if (!anilistUser) {
        const urlState = c.req.path;
        const remoteIp = c.env.incoming.socket.remoteAddress;
        const userAgent = c.req.header("User-Agent");

        urlStateBeforeAuth.set(`${remoteIp}@${userAgent}`, urlState);

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
  }
);

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

anilistOAuth.get("/callback", async (c: Context<Env>) => {
  const [code, ..._rest] = c.req.queries("code") ?? [];
  const token_json = await ky
    .post<AnilistTokenResponse>(Anilist.tokenUrl, {
      json: tokenRequestBody(code),
    })
    .json();

  const user_json: AnilistUser = await getGqlResult(
    await getGqlQuery("user"),
    {},
    token_json.access_token
  );

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

  const remoteIp = c.env.incoming.socket.remoteAddress;
  const userAgent = c.req.header("User-Agent");
  const urlState = urlStateBeforeAuth.get(`${remoteIp}@${userAgent}`);
  urlStateBeforeAuth.delete(`${remoteIp}@${userAgent}`);

  return c.html(
    html`<!DOCTYPE html>
      <html>
        <head>
          <script>
            window.location = "${urlState ?? "/home"}";
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
