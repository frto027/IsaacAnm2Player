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

let is_recording_mode = (new URLSearchParams(window.location.search)).get("anm2record") == '1'

export function isRecordingMode(): boolean {
    return is_recording_mode
}

export class HuijiDatabaseFetcher {
    anm2Ids: string[] = []
    onSuccess: (() => void)[] = []
    onFailed: (() => void)[] = []

    responseAnm2 = new Map<string, Actor>()

    addAnm2File(_id: string) {
        this.anm2Ids.push(_id)
    }

    getAnm2File(_id: string): Actor | undefined {
        let result = this.responseAnm2.get(_id)
        if (result == undefined)
            return undefined
        if (structuredClone) {
            return structuredClone(result)
        } else {
            return JSON.parse(JSON.stringify(result))
        }
    }

    addListener(onSuccess: () => void, onFailed: () => void) {
        this.onSuccess.push(onSuccess)
        this.onFailed.push(onFailed)
    }

    private request(anm2Ids: string[]): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            let filter = {
                $or: anm2Ids.map(v => ({
                    _id: v
                }))
            }
            window.$.ajax({
                url: "/api/rest_v1/namespace/data",
                method: "GET",
                data: { filter: JSON.stringify(filter) },
                dataType: "json"
            }).done((msg: any) => {
                for (var i = 0; i < msg._embedded.length; i++) {
                    AnmPlayer.expandActor(msg._embedded[i], keymap)
                    this.responseAnm2.set(msg._embedded[i]._id, msg._embedded[i])
                }
                resolve(true);
            }).fail((jqXHR: AnalyserNode, textStatus: any) => {
                console.log("anm2 json download failed.", textStatus, jqXHR)
                reject()
            })
        });
    }

    async doAction() {
        try {
            const BATCH_SIZE = 50
            // 一次最多请求50条，别太多
            for (let i = 0; i < this.anm2Ids.length; i += BATCH_SIZE) {
                await this.request(this.anm2Ids.slice(i, i + BATCH_SIZE))
            }
            await this.request(this.anm2Ids);
            for (const onSuccess of this.onSuccess)
                onSuccess()
        } catch (e) {
            for (const onFailed of this.onFailed)
                onFailed()
        }
    }
}
