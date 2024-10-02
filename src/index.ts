import { serve } from "@hono/node-server";
import { Context, Hono } from "hono";
import { html } from "hono/html";
import ky from "ky";
import {
  deleteCookie,
  getSignedCookie,
  setCookie,
  setSignedCookie,
} from "hono/cookie";
import dayjs from "dayjs";
import { HTTPException } from "hono/http-exception";

const app = new Hono();

type AnilistTokenResponse = {
  token_type: "Bearer";
  expires_in: number;
  access_token: string;
  refresh_token: string;
};

const cookieSecret = process.env.COOKIE_SECRET;
const anilistClientId = process.env.ANLIST_CLIENT_CODE;
const anilistClientSecret = process.env.ANILIST_CLIENT_SECRET;

if (
  cookieSecret == undefined ||
  anilistClientId == undefined ||
  anilistClientSecret == undefined
) {
  throw new HTTPException(500, { message: "Internal Server Error" });
}

class Anilist {
  static redirectUri = "http://localhost:3000/auth/callback";
  static tokenUrl = "https://anilist.co/api/v2/oauth/token";
  static resourceUrl = "https://graphql.anilist.co";
  static authorizeUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${anilistClientId}&redirect_uri=${Anilist.redirectUri}&response_type=code`;
}

const tokenRequestBody = (code: string) => {
  return {
    grant_type: "authorization_code",
    client_id: anilistClientId,
    client_secret: anilistClientSecret,
    redirect_uri: Anilist.redirectUri,
    code: code,
  };
};
const anilistCookieName = "anilist_access_token";

app.use(async (c, next) => {
  await next();
  setCookie(c, "app_path", c.req.path, {
    httpOnly: true,
    sameSite: "Strict",
    path: "/",
    secure: true,
  });
});

app.get("/", async (c) => {
  const anilist_token = await getSignedCookie(
    c,
    cookieSecret,
    anilistCookieName
  );

  if (anilist_token) {
    return c.redirect("/home");
  }

  return c.html(html`<a href="/auth">Sign in</a>`);
});

app.get("/auth", async (c) => {
  const anilist_token = await getSignedCookie(
    c,
    cookieSecret,
    anilistCookieName
  );

  if (anilist_token) {
    return c.redirect("/home");
  }

  return c.redirect(Anilist.authorizeUrl);
});

app.get("/auth/callback", async (c) => {
  const [code, ..._rest] = c.req.queries("code") ?? [];
  const json = await ky
    .post<AnilistTokenResponse>(Anilist.tokenUrl, {
      json: tokenRequestBody(code),
    })
    .json();

  await setSignedCookie(c, anilistCookieName, json.access_token, cookieSecret, {
    httpOnly: true,
    expires: dayjs().add(2, "d").toDate(),
    secure: true,
    path: "/",
    sameSite: "Strict",
  });

  return c.html(
    html`<!DOCTYPE html>
      <html>
        <head>
          <script>
            window.location = "/home";
          </script>
        </head>
      </html>`
  );
});

app.get("/home", async (c) => {
  const anilist_token = await getSignedCookie(
    c,
    cookieSecret,
    anilistCookieName
  );
  const json = await ky
    .post<{ data: { Viewer: { id: string; name: string } } }>(
      Anilist.resourceUrl,
      {
        headers: {
          Authorization: `Bearer ${anilist_token}`,
        },
        json: {
          query: `
{
  Viewer {
    id
    name
  }
}
`,
        },
      }
    )
    .json();

  return c.html(`<form method="post" action="logout">
  <button type="submit">Logout</button>
</form>
<pre>${JSON.stringify(json, null, 4)}<pre>`);
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
