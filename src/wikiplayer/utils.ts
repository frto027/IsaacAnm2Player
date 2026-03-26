import { AnmPlayer } from "../player/player";
import { keymap } from "./datas/datas";
import { huijiUrlBuilder } from "./huiji";
import { WikiPlayer } from "./wikiplayer";

function InitPlayer(canvasdiv: HTMLElement) {
    new WikiPlayer(canvasdiv)
}

var CharaElementTemplate = new Map([
    ["isaac","https://huiji-public.huijistatic.com/isaac/uploads/b/bd/Isaac_Icon.png"],
    ["apollyon","https://huiji-public.huijistatic.com/isaac/uploads/8/86/Apollyon_Icon.png"],
    ["bluebaby","https://huiji-public.huijistatic.com/isaac/uploads/3/3a/Blue_Baby_Icon.png"],
    ["forgotten","https://huiji-public.huijistatic.com/isaac/uploads/6/6c/The_Forgotten_Icon.png"],
    ["forgottensoul","https://huiji-public.huijistatic.com/isaac/uploads/b/b4/The_Soul_Icon.png"],
    ["keeper","https://huiji-public.huijistatic.com/isaac/uploads/f/f8/Keeper_Icon.png"],
    ["lilith","https://huiji-public.huijistatic.com/isaac/uploads/9/9c/Lilith_Icon.png"],
    ["shadow","https://huiji-public.huijistatic.com/isaac/uploads/3/3a/Dark_Judas_Icon.png"],
])


function initJsonPage(path: string) {
    var infocard = document.createElement("div")
    infocard.style.cssText = "border:1px solid white;border-radius:8px;padding:10px"
    infocard.innerHTML = "<h4>Anm2文件</h4>" +
        '<div class="input-group">' +
        '<span class="input-group-addon" id="basic-addon1">文件路径：</span>' +
        '<input type="text" id="anm-previewcard-title" class="form-control" readonly>' +
        '</div>' +

        "<div style='margin:10px 0 10px 0' id='anm-previewcard-buttons'><button id='anm-previewcard-displayjson' class='btn btn-primary'>显示原始JSON</button><button id='anm-previewcard-loadanm' class='btn btn-success' style='margin-left:10px'>加载动画</button></div>"
        ;
    (infocard.querySelector('#anm-previewcard-title') as any).value = path

    var wiki_content = window.$('#mw-content-text')[0]
    var json_table = wiki_content.querySelector('.mw-jsonconfig')
    window.$(json_table).hide()

    wiki_content.appendChild(infocard)

    infocard.querySelector('#anm-previewcard-displayjson')?.addEventListener("click", () => {
        infocard.remove()
        window.$(json_table).show()
    })

    infocard.querySelector('#anm-previewcard-loadanm')?.addEventListener("click", function () {
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
        }).done(function (msg: any) {
            if (msg._embedded.length == 1) {
                AnmPlayer.expandActor(msg._embedded[0], keymap)
                var anm = new AnmPlayer(msg._embedded[0], huijiUrlBuilder)

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
                    var ctx = canvas.getContext('2d')!
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

function init_anm2player_tabs(target:HTMLElement) {
    var select_pannel = document.createElement('div')
    var elems: HTMLElement[] = []
    var btns: HTMLElement[] = []

    let selected = "isaac"
    var last_selected = -1

    var nextAnimation: (() => void) | undefined = undefined
    var isAnimating = false

    select_pannel.style.borderTop = "groove #595959 1px"
    function flushButtonUI(nextButton: string | null) {
        for (var j = 0; j < elems.length; j++) {
            if (elems[j]!.getAttribute('data-chara-target') != nextButton) {
                btns[j]!.style.borderBottom = ''
            } else {
                btns[j]!.style.borderBottom = 'dashed 1px gray'
            }
        }
    }
    function flushTargetUI() {
        var new_selected = -1
        if (last_selected == -1) {
            for (var j = 0; j < elems.length; j++) {
                if (elems[j]!.getAttribute('data-chara-target') != selected) {
                    elems[j]!.style.visibility = 'hidden'
                    btns[j]!.style.filter = 'brightness(0.4)'
                } else {
                    btns[j]!.style.filter = ''
                    last_selected = j
                }
            }
            return
        }
        isAnimating = true
        for (var j = 0; j < elems.length; j++) {
            // 移动动画，暂时不做
            var target_anm_ctrl = (elems[j]!.querySelector(".anm2player") as HTMLElement)?.AnmCostumeController

            if (elems[j]!.getAttribute('data-chara-target') != selected) {
                if (last_selected == j) {
                    // remove me
                    if (new_selected == -1) {
                        elems[j]!.classList.remove('chara-player-show-l')
                        elems[j]!.classList.remove('chara-player-show-r')
                        elems[j]!.classList.add('chara-player-hide-l')
                        // if(target_anm_ctrl){
                        //     target_anm_ctrl.SuggestMoveLeft()
                        // }    

                    } else {
                        elems[j]!.classList.remove('chara-player-show-l')
                        elems[j]!.classList.remove('chara-player-show-r')
                        elems[j]!.classList.add('chara-player-hide-r')
                        // if(target_anm_ctrl){
                        //     target_anm_ctrl.SuggestMoveRight()
                        // }    

                    }
                }
                // $(elems[j]).hide()
                btns[j]!.style.filter = 'brightness(0.4)'
            } else {
                //play anim
                target_anm_ctrl?.StartDrawAnm()

                //move show
                // elems[j].style.display = 'inline-block'
                if (last_selected < j) {
                    elems[j]!.classList.remove('chara-player-hide-l')
                    elems[j]!.classList.remove('chara-player-hide-r')
                    elems[j]!.classList.add('chara-player-show-r')
                    // if(target_anm_ctrl){
                    //     target_anm_ctrl.SuggestMoveLeft()
                    // }    
                } else {
                    elems[j]!.classList.remove('chara-player-hide-l')
                    elems[j]!.classList.remove('chara-player-hide-r')
                    elems[j]!.classList.add('chara-player-show-l')
                    // if(target_anm_ctrl){
                    //     target_anm_ctrl.SuggestMoveRight()
                    // }    
                }
                elems[j]!.style.visibility = ''
                new_selected = j

                // $(elems[j]).show(1000)
                btns[j]!.style.filter = ''
            }
        }
        last_selected = new_selected
    }

    var first_character = true
    for (var i = 0; i < target.children.length; i++) {
        var sub_player = target.children[i] as HTMLElement
        let character = sub_player.getAttribute('data-chara-target')
        if (character && CharaElementTemplate.has(character)) {
            var btn = document.createElement('img')
            btn.src = CharaElementTemplate.get(character!)!
            btn.style.borderRadius = '3px'
            btn.style.margin = '0px -4px'
            btn.onclick = function () {
                    if (isAnimating) {
                        flushButtonUI(character)
                        nextAnimation = function () {
                            if (selected != character) {
                                selected = character!
                                flushTargetUI()
                            }
                        }
                    } else {
                        if (selected != character) {
                            selected = character!
                            flushTargetUI()
                        }
                    }
                }
            sub_player.style.display = 'inline-block'
            if (first_character) {
                first_character = false
            } else {
                sub_player.style.position = 'absolute'
                sub_player.style.left = '0'
                sub_player.style.top = '0'
            }

            select_pannel.appendChild(btn)
            elems.push(sub_player)
            sub_player.addEventListener("animationend", function (e) {
                var target_anm_ctrl = ((e.target as HTMLElement).querySelector(".anm2player") as HTMLElement)?.AnmCostumeController

                let target = e.target as HTMLElement
                if (target.classList.contains('chara-player-hide-l') || target.classList.contains('chara-player-hide-r')) {
                    target.style.visibility = 'hidden'
                    if (target_anm_ctrl != undefined) {
                        target_anm_ctrl.SuggestPause()
                    }
                }

                isAnimating = false
                if (nextAnimation) {
                    nextAnimation()
                    nextAnimation = undefined
                }
            })
            btns.push(btn)
        } else {
            sub_player.style.display = 'none'
        }
    }

    target.style.position = 'relative'

    target.appendChild(select_pannel)
    flushTargetUI()
}

export function setupAnm2Players() {
    window.init_anm2player_canvas = InitPlayer

    var canvases = window.$('.anm2player')

    for (var i = 0; i < canvases.length; i++) {
        InitPlayer(canvases[i])
    }

    var pageName = window.mw.config.get("wgPageName")
    if (pageName && pageName.startsWith("Data:Anm2/") && pageName.endsWith(".json")) {
        initJsonPage(pageName.substr(5))
    }
    var targets = document.getElementsByClassName("chara-target-tabs")
    window.init_anm2player_tabs = init_anm2player_tabs

    {
        var style = document.createElement('style')
        document.head.appendChild(style)

        style.sheet!.insertRule('@keyframes showCharaPlayerAnmL{ from { transform:translate(-100%,0);opacity:0 } to { transform:translate(0%,0);opacity:1 } }')
        style.sheet!.insertRule('@keyframes hideCharaPlayerAnmL{ from { transform:translate(0%,0);opacity:1 } to { transform:translate(-100%,0);opacity:0 } }')
        style.sheet!.insertRule('@keyframes showCharaPlayerAnmR{ from { transform:translate(100%,0);opacity:0 } to { transform:translate(0%,0);opacity:1 } }')
        style.sheet!.insertRule('@keyframes hideCharaPlayerAnmR{ from { transform:translate(0%,0);opacity:1 } to { transform:translate(100%,0);opacity:0 } }')
        style.sheet!.insertRule('.chara-player-show-l{animation-name: showCharaPlayerAnmL; animation-duration:0.2s; } ')
        style.sheet!.insertRule('.chara-player-show-r{animation-name: showCharaPlayerAnmR; animation-duration:0.2s; } ')
        style.sheet!.insertRule('.chara-player-hide-l{animation-name: hideCharaPlayerAnmL; animation-duration:0.2s;animation-fill-mode: forwards;} ')
        style.sheet!.insertRule('.chara-player-hide-r{animation-name: hideCharaPlayerAnmR; animation-duration:0.2s;animation-fill-mode: forwards;} ')
    }

    for (var i = 0; i < targets.length; i++) {
        init_anm2player_tabs(targets[i] as HTMLElement)
    }

}