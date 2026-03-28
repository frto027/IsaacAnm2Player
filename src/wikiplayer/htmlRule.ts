import type { AnmPlayer, WebGLOverlay } from "../player/player";

export interface HtmlRule {
  onclick?: () => void,
  onend?: (index: number, clicked: boolean) => void,
  onkeydown?: (key: string) => boolean,
  onkeyup?: (key: string) => boolean,
  onevent?: (index: number, eventname: string) => void,
  update?: (index: number) => void,
}

export type HtmlRuleConstructor = (anms: AnmPlayer[], canvas: HTMLCanvasElement, webgl_overlay: WebGLOverlay | undefined) => HtmlRule