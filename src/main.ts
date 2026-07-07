import { ObsidianPlugin } from "./core/types";
import { registerCore } from "./core";

export default class TemplatePlugin extends ObsidianPlugin {
  async onload() {
    await registerCore(this);
  }
}
