interface Info {
    CreatedBy: string | null
    CreatedOn: string | null
    Fps: number
    Version: string | null
}
interface Spritesheet {
    Id: number
    Path: string | null
}
interface Layer {
    Id: number
    Name: string | null
    SpritesheetId: number
}
interface Null {
    Id: number
    Name: string | null
}
interface PEvent{
    Id:number
    Name:string
}
interface Content {
    Spritesheets: Spritesheet[]
    Layers: Layer[]
    Nulls: Null[]
    Events: PEvent[]
}
interface Frame {
    Width:number
    Height:number
    XPosition: number
    YPosition: number
    Delay: number
    Visible: boolean
    XPivot:number
    YPivot:number
    XCrop:number
    YCrop:number
    XScale: number
    YScale: number
    RedTint: number
    GreenTint: number
    BlueTint: number
    AlphaTint: number
    RedOffset: number
    GreenOffset: number
    BlueOffset: number
    Rotation: number
    Interpolated: boolean
}
interface LayerAnimation {
    LayerId:number
    Visible:boolean
    frames: Frame[]
}

interface NullAnimation {
    NullId: number
    Visible: boolean
    frames: Frame[]
}

interface Triggers{
    EventId:number
    AtFrame:number
}

interface PAnimation {
    Name: string | null
    FrameNum: number
    Loop: boolean

    RootAnimation: Frame[]
    LayerAnimations: LayerAnimation[]
    NullAnimations: NullAnimation[]
    Triggers: Triggers[]
}
interface PAnimations {
    DefaultAnimation: string | null

    animation: PAnimation[]
}

interface Actor {
    info: Info | null
    content: Content | null
    animations: PAnimations | null
}

