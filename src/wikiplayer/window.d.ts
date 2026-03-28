import type { HtmlRuleConstructor } from "./htmlRule"
import type { JsonPage } from "./jsonpage"
import type { Anm2TabGroups } from "./tabs"
import type { WikiPlayer } from "./wikiplayer"
export declare global {

   interface Window {

      /* 愚人节走路效果 */
      enableMoveChara: () => void
      /* htmlrule的输入，在零件初始化前，由页面上的#html模板添加 */
      anm2Rule?: Map<string, HtmlRuleConstructor>

      /* anm2Player添加的接口，动态加载内容请手动扫描元素并调用此接口 参考setupAnm2Players函数 */
      init_anm2player_canvas?: (HTMLElement) => void
      init_anm2player_tabs?: (ElemHTMLElementent) => void

      /* 
      wikiplayers的解析结果。
      如果想要操纵动画，建议通过htmlrule，以便与wikitext进行更好的交互 
      */
      anm2players?:{
         wikplayers:WikiPlayer[],
         anm2Tabs:Anm2TabGroups[],
         jsoonPage?:JsonPage
      }

      $?: any /* jquery */
      /* huiji tools */
      $notification: {
         info:(option:CockpitNotificationOption)=>void
         warning:(option:CockpitNotificationOption)=>void
         success:(option:CockpitNotificationOption)=>void
         error:(option:CockpitNotificationOption)=>void
         create:(option:CockpitNotificationOption)=>void
         destroyAll:()=>void
      },
      $dialog:{
         info:(option:CockpitDialogArgument)=>void
         warning:(option:CockpitDialogArgument)=>void
         success:(option:CockpitDialogArgument)=>void
         error:(option:CockpitDialogArgument)=>void
         create:(option:CockpitDialogArgument)=>void
      }
      mw: any /* mediawiki */
      showDirectoryPicker?:(options:any)=>Promise<FileSystemDirectoryHandle> /* 实验性的api */
   }

   interface HTMLElement {
      /* patched controller for anmplayers */
      AnmCostumeController?: AnmCostumeController
   }
}

interface AnmCostumeController {
    StartDrawAnm: () => void,
    StopDrawAnm: () => void,
    CancelWaitingForClick: ()=>void
}

// https://www.huijiwiki.com/wiki/%E5%B8%AE%E5%8A%A9:%E4%BD%BF%E7%94%A8cockpit%E7%BB%84%E4%BB%B6
interface CockpitNotificationOption{
   // 以下内容手抄的更新日志
   closable?:boolean,
   title?:string,
   content?:string,
   description?:string,
   meta?:string,
   keepAliveOnHover?:boolean,
   duration?:number|undefined,
   onClose?:()=>boolean | Promise<boolean>
   onLeave?:()=>void
   onAfterLeave?:()=>void
   onAfterEnter?:()=>void
}

interface CockpitDialogArgument{
   title:string,
   content:string|Element|(()=>Element),
   closable?:boolean,
   blockScrool?:boolean,
   closeOnEsc?:boolean,
   maskClosable?:boolean,
   positiveText?:string,
   onPositiveClick?:(e:MouseEvent)=>boolean|undefined|Promise<boolean|undefined>
   negativeText?:string
   onNegativeClick?:(e:MouseEvent)=>boolean|undefined|Promise<boolean|undefined>
   onMaskClick?:()=>void
   onClose?:(e:MouseEvent)=>boolean|undefined|Promise<boolean|undefined>,
   style?:string
}