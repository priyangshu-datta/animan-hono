const cookieSecret = process.env.COOKIE_SECRET!;
const anilistClientId = process.env.ANLIST_CLIENT_CODE;
const anilistClientSecret = process.env.ANILIST_CLIENT_SECRET;

export { cookieSecret, anilistClientId, anilistClientSecret };

export class Anilist {
  static redirectUri = "http://localhost:3000/auth/callback";
  static tokenUrl = "https://anilist.co/api/v2/oauth/token";
  static resourceUrl = "https://graphql.anilist.co";
  static authorizeUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${anilistClientId}&redirect_uri=${Anilist.redirectUri}&response_type=code`;
}
export const tokenRequestBody = (code: string) => {
  return {
    grant_type: "authorization_code",
    client_id: anilistClientId,
    client_secret: anilistClientSecret,
    redirect_uri: Anilist.redirectUri,
    code: code,
  };
};
export const anilistCookieName = "anilist_state";
