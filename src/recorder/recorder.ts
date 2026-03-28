import { isRecordingMode } from "../wikiplayer/huiji"
import type { WikiPlayer } from "../wikiplayer/wikiplayer"

import "./recorder.css"

class RecorderIndicator{
    recording_count = 0
    elem:HTMLElement
    constructor(){
        this.elem = document.createElement("div")
        this.elem.classList.add("anm2-recorder-indicator")
        document.body.appendChild(this.elem)
        this.flush()
    }

    flush(){
        this.elem.innerText = this.recording_count + "个播放器正在录制(shift+R开关)"
        if(this.recording_count == 0){
            this.elem.classList.remove("anm2-recorder-indicator-recording")
        }else{
            this.elem.classList.add("anm2-recorder-indicator-recording")
        }
    }
    inc(){
        this.recording_count++
        this.flush()
    }
    dec(){
        this.recording_count--
        this.flush()
    }
    static instance?:RecorderIndicator
    static getInstatnce():RecorderIndicator{
        if(RecorderIndicator.instance == undefined)
            RecorderIndicator.instance = new RecorderIndicator()
        return RecorderIndicator.instance
    }
}


export class Anm2Recorder {
    player: WikiPlayer

    isRecording = false

    dir: FileSystemDirectoryHandle

    nextFileId = 0

    thisFrameIsCaptured = false

    recorder_hint_container:HTMLElement
    recorder_hint:HTMLElement

    constructor(player: WikiPlayer, dir: FileSystemDirectoryHandle) {
        this.player = player
        this.dir = dir

        RecorderIndicator.getInstatnce();

        this.recorder_hint_container = document.createElement("div")
        this.recorder_hint_container.classList.add("anm2-recorder-hint-container")
        this.recorder_hint = document.createElement("div")
        this.recorder_hint.classList.add("anm2-recorder-hint")

        this.recorder_hint_container.appendChild(this.recorder_hint)
        player.canvasContainer.appendChild(this.recorder_hint_container)

        this.recorder_hint.innerText = "录制中"
        this.recorder_hint_container.style.display = "none"
    }

    update() {
        if (this.isRecording) {
            if(this.player.isDirty)
                this.player.realDraw()
            this.thisFrameIsCaptured = false
            this.record() // 虽然record是异步的，但是它在异步操作之前应当启动捕获
            console.assert(this.thisFrameIsCaptured)
        }
    }

    handleKey(key: string): boolean {
        if (key.toLowerCase() == "r") {
            if (this.isRecording)
                this.stopRecord()
            else
                this.startRecord()
            return true
        }

        return false
    }

    startRecord() {
        if(!this.isRecording)
            RecorderIndicator.getInstatnce().inc()
        this.isRecording = true
        this.recorder_hint_container.style.display = "block"
    }
    stopRecord() {
        if(this.isRecording)
            RecorderIndicator.getInstatnce().dec()
        this.isRecording = false
        this.recorder_hint_container.style.display = "none"

    }

    captureCanvas(): Promise<Blob> {
        let has_result = false
        let blob: Blob | null
        let exception: any = undefined

        let has_promise = false
        let resolve: (result: Blob) => void
        let reject: (e: any) => void

        function done() {
            if (has_result && has_promise) {
                if (exception) {
                    reject(exception)
                } else if (blob == null) {
                    reject(new Error("获得数据为空"))
                } else {
                    resolve(blob)
                }
            }
        }

        try {
            // 1 我们希望无延迟地启动toBolb函数，所以这一步不能套在promise里面
            this.thisFrameIsCaptured = true;

            let canvas = this.player.canvasElement!;

            if(this.player.backendCanvas){
                if(!isRecordingMode()){
                    // 在非recording mode下，我们无法获取webgl的渲染结果，因此只能获得anm2的绘制结果
                    canvas = this.player.backendCanvas;
                }
            }

            canvas.toBlob(_blob => {
                // 2 这里和下面哪一个先执行，是未定义行为
                has_result = true
                blob = _blob
                done()
            })
        } catch (e) {
            has_result = true
            exception = e
            done()
        }

        return new Promise<Blob>((_resolve, _reject) => {
            has_promise = true
            resolve = _resolve
            reject = _reject
            done()
        })
    }

    async saveFile(blobPromise: Promise<Blob>, fileId: number) {
        try {
            let blob = await blobPromise;
            let file = await this.dir.getFileHandle(fileId + ".png", {
                create: true
            });
            let stream = await file.createWritable({
                keepExistingData: false
            });
            await stream.write(blob);
            await stream.close();
        } catch (e) {
            console.error(e);
            window.alert("我们无法完成录制保存，相关错误信息已展示在控制台，录制已停止")
            this.stopRecord();
        }
    }


    record() {
        let fileId = this.nextFileId++
        try {
            let blob = this.captureCanvas();
            this.saveFile(blob, fileId)// start async save file task
        } catch (e) {
            console.error(e);
            window.alert("我们无法完成录制，相关错误信息已展示在控制台，录制已停止")
            this.stopRecord();
        }
    }
}