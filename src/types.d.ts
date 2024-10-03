import { HttpBindings } from "@hono/node-server";

type AnilistTokenResponse = {
  token_type: "Bearer";
  expires_in: number;
  access_token: string;
  refresh_token: string;
};

type Env = {
  Bindings: HttpBindings;
  Variables: {
    anilist_token: string;
    user_id: number;
    name: string;
    avatar: string;
  };
};

type CurrentWatching = {
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
};

type AnilistUser = {
  data: {
    Viewer: {
      id: number;
      name: string;
      avatar: { large: string; medium: string };
    };
  };
};
