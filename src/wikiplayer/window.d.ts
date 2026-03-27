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
      $notification: any /* huiji tools */
      mw: any /* mediawiki */

   }

   interface HTMLElement {
      /* patched controller for anmplayers */
      AnmCostumeController?: AnmCostumeController
   }
}
