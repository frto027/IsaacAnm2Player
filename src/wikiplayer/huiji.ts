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
import { AnmPlayer } from "../player/player"
import { md5 } from "../tools/md5"
import { keymap } from "./datas/datas"

export function huijiUrlBuilder(url: string) {
    /* 注意过滤url */
    url = url.replace(new RegExp("[/ \\?&]", "g"), "_")
    url = url[0]!.toUpperCase() + url.substring(1)
    var hash = md5(url)
    url = "https://huiji-public.huijistatic.com/isaac/uploads/" + hash[0] + "/" + hash[0] + hash[1] + "/" + url
    return url
}

let is_recording_mode = new URLSearchParams(window.location.search).get("anm2record") == "1"

export function isRecordingMode(): boolean {
    return is_recording_mode
}

export enum DbFetchSuggest {
    Unk,
    DontFetchAltSkin,
    FetchAltSkin,
}

export class HuijiDatabaseFetcher {
    anm2Ids: string[] = []
    onSuccess: (() => void)[] = []
    onFailed: (() => void)[] = []

    responseAnm2 = new Map<string, Actor>()

    respCharaCostumes = new Map<string /* png url */, Set<string>>()

    dbFetchSuggest = DbFetchSuggest.DontFetchAltSkin

    addAnm2File(_id: string) {
        if (this.anm2Ids.indexOf(_id) == -1) this.anm2Ids.push(_id)
    }

    getAnm2File(_id: string): Actor | undefined {
        let result = this.responseAnm2.get(_id)
        if (result == undefined) return undefined
        if (structuredClone) {
            return structuredClone(result)
        } else {
            return JSON.parse(JSON.stringify(result))
        }
    }
    // ------------------------->      1                                         2       3    4
    static ALT_SKIN_RE = new RegExp("^(resources-repp/gfx/characters/costumes)([a-z_]*)(/.*)(\\.png)$")

    getAltSkin(url: string, chara: string, color: string): string {
        let m = HuijiDatabaseFetcher.ALT_SKIN_RE.exec(url)
        if (!m) return url
        let clean_url = m[1]! + m[3]!
        // console.log("clean url is ", clean_url)

        let obj = this.respCharaCostumes.get(clean_url + ".png")
        // console.log(obj)
        if (obj == undefined) return url

        let pchara = chara.length > 0 ? "_" + chara : ""
        let pcolor = color.length > 0 ? "_" + color : ""
        if (obj.has(chara + ":" + color)) return m[1]! + pchara + m[3]! + pcolor + ".png"
        if (obj.has(chara + ":")) return m[1]! + pchara + m[3]! + ".png"
        if (obj.has(":" + color)) return m[1]! + m[3]! + pcolor + ".png"
        return url
    }

    addListener(onSuccess: () => void, onFailed: () => void) {
        this.onSuccess.push(onSuccess)
        this.onFailed.push(onFailed)
    }

    private request(filter: any): Promise<any> {
        return new Promise<boolean>((resolve, reject) => {
            window.$.ajax({
                url: "/api/rest_v1/namespace/data",
                method: "GET",
                data: { filter: JSON.stringify(filter) },
                dataType: "json",
            })
                .done((msg: any) => {
                    resolve(msg)
                })
                .fail((jqXHR: AnalyserNode, textStatus: any) => {
                    console.log("request failed", textStatus, jqXHR)
                    reject()
                })
        })
    }

    private async requestAnm2Files(anm2Ids: string[]): Promise<boolean> {
        let filter = {
            $or: anm2Ids.map((v) => ({
                _id: v,
            })),
        }

        let msg = await this.request(filter)
        for (var i = 0; i < msg._embedded.length; i++) {
            AnmPlayer.expandActor(msg._embedded[i], keymap)
            this.responseAnm2.set(msg._embedded[i]._id, msg._embedded[i])
        }

        return true
    }

    private async requestCharaCostumes(pngs: string[]) {
        let filter = {
            $and: [
                {
                    _id: {
                        $regex: "^Data:CharaCostume\\.tabx",
                    },
                },
                {
                    $or: pngs.map((v) => ({
                        sprite_path: v,
                    })),
                },
            ],
        }

        let msg = await this.request(filter)
        for (let i = 0; i < msg._embedded.length; i++) {
            let obj = msg._embedded[i]
            if (typeof obj.sprite_path != "string") continue
            if (!this.respCharaCostumes.has(obj.sprite_path)) this.respCharaCostumes.set(obj.sprite_path, new Set())
            let charas = obj.characolors
            if (typeof charas != "object") continue
            let set = this.respCharaCostumes.get(obj.sprite_path)!
            for (let i = 0; i < charas.length; i++) {
                let combo = charas[i]
                if (typeof combo != "string") continue
                set.add(combo)
            }
        }
        return true
    }

    async execute() {
        try {
            const BATCH_SIZE = 50
            // 一次最多请求50条，别太多
            for (let i = 0; i < this.anm2Ids.length; i += BATCH_SIZE) {
                await this.requestAnm2Files(this.anm2Ids.slice(i, i + BATCH_SIZE))
            }

            if (this.dbFetchSuggest != DbFetchSuggest.DontFetchAltSkin) {
                let png_files: string[] = []
                for (let anm of this.responseAnm2.values()) {
                    for (const sprite of anm.content?.Spritesheets ?? []) {
                        if (typeof sprite.Path == "string" && sprite.Path.indexOf("/gfx/characters/costumes") > 0)
                            png_files.push(sprite.Path)
                    }
                }
                if (png_files.length > 0) {
                    await this.requestCharaCostumes(png_files)
                }
            }

            for (const onSuccess of this.onSuccess) onSuccess()
        } catch (e) {
            for (const onFailed of this.onFailed) onFailed()
        }
    }
}
