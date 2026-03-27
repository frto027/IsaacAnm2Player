import { AnmPlayer } from "../player/player";
import { keymap } from "./datas/datas";
import { huijiUrlBuilder } from "./huiji";

export class JsonPage{
    infocard: HTMLDivElement;
    anmplayer?: AnmPlayer;
    constructor(path:string){
        let infocard = document.createElement("div")
        this.infocard = infocard
        infocard.style.cssText = "border:1px solid white;border-radius:8px;padding:10px"
        infocard.innerHTML = "<h4>Anm2文件</h4>" +
            '<div class="input-group">' +
            '<span class="input-group-addon" id="basic-addon1">文件路径：</span>' +
            '<input type="text" id="anm-previewcard-title" class="form-control" readonly>' +
            '</div>' +

            "<div style='margin:10px 0 10px 0' id='anm-previewcard-buttons'><button id='anm-previewcard-displayjson' class='btn btn-primary'>显示原始JSON</button><button id='anm-previewcard-loadanm' class='btn btn-success' style='margin-left:10px'>加载动画</button></div>"
            ;
        (infocard.querySelector('#anm-previewcard-title') as HTMLInputElement).value = path

        let wiki_content = window.$('#mw-content-text')[0]
        let json_table = wiki_content.querySelector('.mw-jsonconfig')
        window.$(json_table).hide()

        wiki_content.appendChild(infocard)

        infocard.querySelector('#anm-previewcard-displayjson')?.addEventListener("click", () => {
            infocard.remove()
            window.$(json_table).show()
        })

        infocard.querySelector('#anm-previewcard-loadanm')?.addEventListener("click", () => {
            infocard.querySelector('#anm-previewcard-buttons')!.remove()
            var names = document.createElement('select')
            infocard.appendChild(document.createElement('hr'))
            infocard.appendChild(names)

            var replay = document.createElement('button')
            replay.style.cssText = "margin-left:10px"
            replay.classList.add('btn')
            replay.classList.add('btn-primary')
            replay.innerText = "重新播放"
            infocard.appendChild(replay)
            infocard.appendChild(document.createElement('hr'))

            var canvas = document.createElement('canvas')
            canvas.width = 800
            canvas.height = 600
            canvas.style.cssText = 'background:#FFF'
            infocard.appendChild(canvas)

            window.$.ajax({
                url: "/api/rest_v1/namespace/data",
                method: "GET",
                data: { filter: JSON.stringify({ _id: "Data:" + path }) },
                dataType: "json"
            }).done((msg: any) => {
                if (msg._embedded.length == 1) {
                    AnmPlayer.expandActor(msg._embedded[0], keymap)
                    let anm = new AnmPlayer(msg._embedded[0])
                    this.anmplayer = anm
                    var anmnames = anm.getAnmNames()
                    for (var i = 0; i < anmnames.length; i++) {
                        var names_option = document.createElement('option')
                        names_option.value = anmnames[i]!
                        names_option.innerText = anmnames[i]!
                        names.appendChild(names_option)
                    }
                    names.value = anm.getDefaultAnmName()

                    names.onchange = function () {
                        anm.setFrame(names.value, 0)
                    }
                    replay.onclick = function () {
                        anm.play(0)
                    }

                    let draw = () => {
                        anm.update()
                        let ctx = canvas.getContext('2d')!
                        ctx.imageSmoothingEnabled = false
                        ctx.setTransform(1, 0, 0, 1, 0, 0);
                        ctx.clearRect(0, 0, canvas.width, canvas.height)
                        anm.drawCanvas(ctx, canvas, canvas.width / 2, canvas.height / 2, 1)
                    }
                    setInterval(draw, 1000 / anm.getFps())
                }
            }).fail(function (jqXHR: any, textStatus: any) {
                console.log("anm2 json download failed.", textStatus, jqXHR)
            })
        })

    }
}
