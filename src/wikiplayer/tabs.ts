enum CharaTabOption {
    isaac = "isaac",
    apollyon = "apollyon",
    bluebaby = "bluebaby",
    forgotten = "forgotten",
    forgottensoul = "forgottensoul",
    keeper = "keeper",
    lilith = "lilith",
    shadow = "shadow",
}

enum PlayerStatus {
    Hided,
    Showed,
    HideToL,
    HideToR,
    ShowFromL,
    ShowFromR,
}

enum ButtonStatus {
    NotSelected,
    Selected
}

let CharaElementTemplate = new Map([
    [CharaTabOption.isaac, "https://huiji-public.huijistatic.com/isaac/uploads/b/bd/Isaac_Icon.png"],
    [CharaTabOption.apollyon, "https://huiji-public.huijistatic.com/isaac/uploads/8/86/Apollyon_Icon.png"],
    [CharaTabOption.bluebaby, "https://huiji-public.huijistatic.com/isaac/uploads/3/3a/Blue_Baby_Icon.png"],
    [CharaTabOption.forgotten, "https://huiji-public.huijistatic.com/isaac/uploads/6/6c/The_Forgotten_Icon.png"],
    [CharaTabOption.forgottensoul, "https://huiji-public.huijistatic.com/isaac/uploads/b/b4/The_Soul_Icon.png"],
    [CharaTabOption.keeper, "https://huiji-public.huijistatic.com/isaac/uploads/f/f8/Keeper_Icon.png"],
    [CharaTabOption.lilith, "https://huiji-public.huijistatic.com/isaac/uploads/9/9c/Lilith_Icon.png"],
    [CharaTabOption.shadow, "https://huiji-public.huijistatic.com/isaac/uploads/3/3a/Dark_Judas_Icon.png"],
])

interface Anm2TabGroup {
    playerElement: HTMLElement,
    button: HTMLElement,
    thisOption: CharaTabOption,
    index: number,
    playerStatus: PlayerStatus
}

import "./tabs.css"

export class Anm2TabGroups {
    select_pannel: HTMLDivElement
    groups: Anm2TabGroup[] = []


    is_animating = false

    constructor(target: HTMLElement) {
        this.select_pannel = document.createElement('div')
        this.select_pannel.classList.add("anm2-tab-group-select-panel")

        let chara_index = 0

        for (let i = 0; i < target.children.length; i++) {
            let sub_player = target.children[i] as HTMLElement
            let character = sub_player.getAttribute('data-chara-target')
            if (character && CharaElementTemplate.has(character as CharaTabOption)) {
                let index = chara_index++

                sub_player.classList.add(index == 0 ? "anm2-sub-player-first" : "anm2-sub-player-others")
                sub_player.addEventListener("animationend", () => {
                    this.onAnmEnd(index)
                })

                let btn = document.createElement('img')
                btn.classList.add("anm2-sub-player-button")
                this.select_pannel.appendChild(btn)
                btn.src = CharaElementTemplate.get(character as CharaTabOption)!
                btn.onclick = () => {
                    this.onBtnClick(index)
                }

                this.groups.push({
                    playerElement: sub_player,
                    button: btn,
                    thisOption: character as CharaTabOption,
                    index: index,
                    playerStatus: PlayerStatus.Hided
                })
                if (index > 0) {
                    sub_player.classList.add('chara-player-hide')
                }

                sub_player.style.display = ''
            } else {
                sub_player.classList.add("anm2-sub-player-unk-chara")
            }
        }

        target.style.position = 'relative'

        target.appendChild(this.select_pannel)

        // set the initial status
        for (let group of this.groups) {
            if (group.index == 0) {
                this.setButtonStatus(group, ButtonStatus.Selected)
                this.setAnmPlayerStatus(group, PlayerStatus.Showed)
                this.selected = 0
                this.next_select = 0
                this.is_animating = false
            } else {
                this.setButtonStatus(group, ButtonStatus.NotSelected)
                this.setAnmPlayerStatus(group, PlayerStatus.Hided)
            }
        }
    }

    setButtonStatus(group: Anm2TabGroup, buttonStatus: ButtonStatus) {
        let handle = (n: string, status: boolean) => {
            if (status)
                group.button.classList.add(n)
            else
                group.button.classList.remove(n)
        }
        handle("anm2-tab-btn-selected", buttonStatus == ButtonStatus.Selected)
        handle("anm2-tab-btn-not-selected", buttonStatus == ButtonStatus.NotSelected)

    }
    setAnmPlayerStatus(group: Anm2TabGroup, status: PlayerStatus) {
        if (group.playerStatus == status)
            return

        if (group.playerStatus == PlayerStatus.Hided) {
            let controller = (group.playerElement.querySelector(".anm2player") as HTMLElement)
                ?.AnmCostumeController;
            if (controller) {
                controller.CancelWaitingForClick()
                controller.StartDrawAnm()
            }
        }
        if (status == PlayerStatus.Hided) {
            (group.playerElement.querySelector(".anm2player") as HTMLElement)
                ?.AnmCostumeController
                ?.StopDrawAnm()
        }

        group.playerStatus = status
        let elem = group.playerElement
        let handle = (n: string, status: boolean) => {
            if (status)
                elem.classList.add(n)
            else
                elem.classList.remove(n)
        }
        handle("chara-player-show-l", status == PlayerStatus.ShowFromL)
        handle("chara-player-show-r", status == PlayerStatus.ShowFromR)
        handle("chara-player-hide-l", status == PlayerStatus.HideToL)
        handle("chara-player-hide-r", status == PlayerStatus.HideToR)
        handle("chara-player-show", status == PlayerStatus.Showed)
        handle("chara-player-hide", status == PlayerStatus.Hided)

        elem = group.button
        handle("anm2-tab-btn-chara-player-hide", status != PlayerStatus.Showed)
        handle("anm2-tab-btn-chara-player-show", status == PlayerStatus.Showed)
    }


    selected = -1
    next_select = -1 // only read this when is_animating == false

    onAnmEnd(i: number) {
        let oldState = this.groups[i]!.playerStatus

        if (oldState == PlayerStatus.HideToL || oldState == PlayerStatus.HideToR) {
            this.setAnmPlayerStatus(this.groups[i]!, PlayerStatus.Hided)
        } else if (oldState == PlayerStatus.ShowFromL || oldState == PlayerStatus.ShowFromR) {
            this.setAnmPlayerStatus(this.groups[i]!, PlayerStatus.Showed)
            this.selected = this.groups[i]!.index
        }

        this.is_animating = false
        for (let group of this.groups) {
            if (group.playerStatus != PlayerStatus.Hided && group.playerStatus != PlayerStatus.Showed)
                this.is_animating = true
        }
        this.tryStartAnimation()
    }

    onBtnClick(i: number) {
        if (this.next_select == i)
            return

        this.setButtonStatus(this.groups[this.next_select]!, ButtonStatus.NotSelected)
        this.next_select = i
        this.setButtonStatus(this.groups[this.next_select]!, ButtonStatus.Selected)

        this.tryStartAnimation()
    }

    tryStartAnimation() {
        if (this.is_animating)
            return

        if (this.next_select == this.selected) {
            return
        }

        for (let group of this.groups) {
            if (group.index == this.selected) {
                this.setAnmPlayerStatus(group, this.selected < this.next_select ? PlayerStatus.HideToL : PlayerStatus.HideToR)
                this.is_animating = true
            }
            if (group.index == this.next_select) {
                this.setAnmPlayerStatus(group, this.selected < this.next_select ? PlayerStatus.ShowFromR : PlayerStatus.ShowFromL)
                this.is_animating = true
            }
        }
    }
}