/*
MIT License

Copyright (c) 2026 frto027

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
import type { AnmPlayer, WebGLOverlay } from "../player/player"
import type { WikiPlayer } from "./wikiplayer"

export interface HtmlRule {
    onclick?: () => void
    onend?: (index: number, clicked: boolean) => void
    onkeydown?: (key: string) => boolean
    onkeyup?: (key: string) => boolean
    onevent?: (index: number, eventname: string) => void
    update?: (index: number) => void
    
    additional_anm?:{
        // 返回true将会取消原有按键功能
        onkeydown?: (key: string) => boolean
        onkeyup?: (key: string) => boolean
        onclick?: () => boolean

        // touch事件处理不可取消，能力非常有限
        // 建议在update读取状态操作
        ontouchstart?: (ev:TouchEvent) => void
        ontouchmove?: (ev:TouchEvent) => void
        ontouchend?: (ev:TouchEvent) => void
        

        //非蓄力道具可用
        onshoot?: () => void
        //蓄力道具可用，注意蓄力释放不代表完整蓄力
        onchangerelease?:()=>void
        // anm的值包括Hit、Pickup、Death等
        // ontargetanmchanged?:(anm:string) => boolean | undefined
    }
}

export type HtmlRuleConstructor = (
    anms: AnmPlayer[],
    canvas: HTMLCanvasElement,
    webgl_overlay: WebGLOverlay | undefined,
    wikiplayer: WikiPlayer
) => HtmlRule
