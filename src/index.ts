import { AnmPlayer } from "./player/player"
import { HuijiDatabaseFetcher } from "./wikiplayer/huiji"
import { JsonPage } from "./wikiplayer/jsonpage"
import { Anm2TabGroups } from "./wikiplayer/tabs"
import { WikiPlayer } from "./wikiplayer/wikiplayer"

window.anm2players = {
    wikplayers: [],
    anm2Tabs: []
}

function initPlayer(canvasdiv: HTMLElement) {
    window.anm2players?.wikplayers.push(new WikiPlayer(canvasdiv))
}

function initAnm2PlayerTabs(target: HTMLElement) {
    window.anm2players?.anm2Tabs.push(new Anm2TabGroups(target))
}
function initJsonPage(path: string) {
    let jsonPage = new JsonPage(path)
    if (window.anm2players)
        window.anm2players.jsoonPage = jsonPage
}

export function setupAnm2Players() {
    AnmPlayer.setCrossOrigin("anonymous");
    window.init_anm2player_canvas = initPlayer

    //初始化播放器
    let huijiDatabaseFetcher = new HuijiDatabaseFetcher()
    let canvases = document.getElementsByClassName('anm2player')
    for (let i = 0; i < canvases.length; i++) {
        window.anm2players?.wikplayers.push(new WikiPlayer(canvases[i] as HTMLElement, huijiDatabaseFetcher))
    }
    huijiDatabaseFetcher.doAction()

    // 初始化json页面
    let pageName = window.mw.config.get("wgPageName")
    if (pageName && pageName.startsWith("Data:Anm2/") && pageName.endsWith(".json")) {
        initJsonPage(pageName.substr(5))
    }

    // 初始化服装选择标签（播放器已经初始化过了）
    let targets = document.getElementsByClassName("chara-target-tabs")
    window.init_anm2player_tabs = initAnm2PlayerTabs
    for (let i = 0; i < targets.length; i++) {
        initAnm2PlayerTabs(targets[i] as HTMLElement)
    }
}

if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', setupAnm2Players)
} else {
    setupAnm2Players()
}

