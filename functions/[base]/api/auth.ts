import { authRoute, type Ctx } from "../../../oauth/routes";

export const onRequestGet = (ctx: Ctx) => authRoute(ctx);
