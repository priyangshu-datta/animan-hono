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
