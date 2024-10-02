import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { html } from "hono/html";
import ky from "ky";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import dayjs from "dayjs";
import { HTTPException } from "hono/http-exception";
import { contextStorage, getContext } from "hono/context-storage";

type AnilistTokenResponse = {
  token_type: "Bearer";
  expires_in: number;
  access_token: string;
  refresh_token: string;
};

type Env = {
  Variables: {
    anilist_token: string;
    user_id: number;
    name: string;
  };
};

const app = new Hono<Env>();
app.use(contextStorage());

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

const protectedRoutes = ["/home", "/current"];

app.use(async (c, next) => {
  if (protectedRoutes.includes(c.req.path)) {
    const anilistUser = await getSignedCookie(
      c,
      cookieSecret,
      anilistCookieName
    );

    if (!anilistUser) {
      process.env["PAUSED_URL"] = c.req.path;
      return c.redirect("/auth");
    } else {
      const [token, id, name] = anilistUser.split(";");
      c.set("anilist_token", token);
      c.set("user_id", parseInt(id));
      c.set("name", name);
    }
  }
  await next();
});

app.get("/", async (c) => {
  const anilistToken = await getSignedCookie(
    c,
    cookieSecret,
    anilistCookieName
  );

  if (anilistToken) {
    return c.redirect("/home");
  }

  return c.html(html`<a href="/auth">Sign in</a>`);
});

app.get("/auth", async (c) => {
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

app.get("/auth/callback", async (c) => {
  const [code, ..._rest] = c.req.queries("code") ?? [];
  const token_json = await ky
    .post<AnilistTokenResponse>(Anilist.tokenUrl, {
      json: tokenRequestBody(code),
    })
    .json();

  const user_json = await ky
    .post<{ data: { Viewer: { id: number; name: string } } }>(
      Anilist.resourceUrl,
      {
        headers: {
          Authorization: `Bearer ${token_json.access_token}`,
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

  await setSignedCookie(
    c,
    anilistCookieName,
    `${token_json.access_token};${user_json.data.Viewer.id};${user_json.data.Viewer.name}`,
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
      </html>`
  );
});

app.get("/current", async (c) => {
  const json = await ky
    .post<{
      data: {
        Page: {
          pageInfo: { currentPage: number; hasNextPage: boolean };
          medaList: {
            media: {
              id: number;
              idMal: number;
              title: { english: string; romaji: string };
              coverImage: { large: string };
              description: string;
              siteUrl: string;
              type: ["ANIME" | "MANGA"];
            };
          };
        };
      };
    }>(Anilist.resourceUrl, {
      headers: {
        Authorization: `Bearer ${getContext<Env>().var.anilist_token}`,
      },
      json: {
        query: `query UserMediaByStatus(
	$userId: Int!
	$status: MediaListStatus!
	$type: MediaType!
	$page: Int = 1
	$limit: Int = 10
) {
	Page(page: $page, perPage: $limit) {
		pageInfo {
			currentPage
			hasNextPage
		}
		mediaList(status: $status, userId: $userId, type: $type, sort: UPDATED_TIME_DESC) {
			media {
				id
				idMal
				title {
					english
					romaji
				}
				coverImage {
					large
				}
				description
				siteUrl
				type
			}
		}
	}
}

`,
        variables: {
          userId: getContext<Env>().var.user_id,
          status: "CURRENT",
          type: "ANIME",
        },
      },
    })
    .json();
  return c.html(html`${JSON.stringify(json, null, 4)}`);
});

app.get("/home", async (c) => {
  return c.html(html`
    <!DOCTYPE html>
    <html>
      <body>
        <form method="post" action="logout">
          <button type="submit">Logout</button>
        </form>
        <section>
          ID: ${getContext<Env>().var.user_id} <br />
          Name: ${getContext<Env>().var.name}
        </section>
      </body>
    </html>
  `);
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
