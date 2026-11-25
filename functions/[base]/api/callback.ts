import { callbackRoute, type Ctx } from "../../../oauth/routes";

export const onRequestGet = (ctx: Ctx) => callbackRoute(ctx);
