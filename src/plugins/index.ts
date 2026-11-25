// The content plugins, in the order they run. Used by astro.config.mjs through
// markdown.processor = satteri({ hastPlugins }).

import type { HastPluginList } from "satteri";
import { calibratedPlugin } from "./calibrated";
import { citationsPlugin } from "./citations";
import { crossRefsPlugin } from "./crossrefs";
import { figurePlaceholderPlugin } from "./figure-placeholder";
import { figuresPlugin } from "./figures";
import { headingIdsPlugin } from "./heading-ids";
import { createNodeEnv } from "./node-env";
import { notesPlugin } from "./notes";
import { structurePlugin } from "./structure";
import type { PluginEnv } from "./support";

export function contentPlugins(env: PluginEnv = createNodeEnv()): HastPluginList {
  return [headingIdsPlugin(), figurePlaceholderPlugin(env), figuresPlugin(), crossRefsPlugin(env), calibratedPlugin(env), notesPlugin(env), structurePlugin(env), citationsPlugin(env)];
}
