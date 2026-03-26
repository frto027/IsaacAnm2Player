import { AnmPlayer } from "../player/player"
import { md5 } from "../tools/md5"
import { keymap } from "./datas/datas"

export function huijiUrlBuilder(url:string, replaced:boolean) {
    /* 注意过滤url */
    var prefix = 'Anm2/'
    if (replaced)
        prefix = ''
    url = (prefix + url).replace(new RegExp("[/ \\?&]", "g"), "_")
    url = url[0]!.toUpperCase() + url.substring(1)
    var hash = md5(url)
    url = "https://huiji-public.huijistatic.com/isaac/uploads/" + hash[0] + "/" + hash[0] + hash[1] + "/" + url
    return url
}

export class HuijiDatabaseRequester{
    filter:any = { "$or": [] }
    constructor(){

    }

    addAnm2File(_id:string){
        this.filter["$or"].push({ "_id": _id })
    }

    downloadJson(onSuccess:(resources:Map<string, Actor>)=>void, onFailed:()=>void){
        window.$.ajax({
            url: "/api/rest_v1/namespace/data",
            method: "GET",
            data: { filter: JSON.stringify(this.filter) },
            dataType: "json"
        }).done(function (msg:any) {
            var resources = new Map<string, Actor>()
            for (var i = 0; i < msg._embedded.length; i++) {
                AnmPlayer.expandActor(msg._embedded[i], keymap)
                resources.set(msg._embedded[i]._id, msg._embedded[i])
            }
            onSuccess(resources)
        }).fail(function (jqXHR:any, textStatus:any) {
            onFailed()
            console.log("anm2 json download failed.", textStatus, jqXHR)
        })
    }
}
