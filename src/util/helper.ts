import { Liquid } from "liquidjs";

const initViewEngine = () => {
  const liquidEngine = new Liquid({
    cache: process.env.ENV?.toUpperCase() === 'PROD',
    layouts: "src/resources/view/layout/",
    partials: "src/resources/view/partial/",
    root: "src/resources/view/template/",
    extname: ".liquid",
  });
  return liquidEngine;
};

export const viewEngine = (() => {
  let instance: Liquid;

  return () => {
    if (!instance) {
      instance = initViewEngine();
    }
    return instance;
  };
})();
