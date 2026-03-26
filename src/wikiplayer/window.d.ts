import { HtmlRule } from "./htmlRule"
export declare global {

   interface Window {
      enableMoveChara: () => void
      anm2Rule?: HtmlRuleConstructor

      $?: any /* jquery */
      $notification: any /* huiji tools */
      mw: any /* mediawiki */

      /* anm2Player added interfaces */
      init_anm2player_canvas?: (Element) => void
      init_anm2player_tabs?: (Element) => void
   }

   interface HTMLElement {
      /* patched controller for anmplayers */
      AnmCostumeController?: any
   }
}
