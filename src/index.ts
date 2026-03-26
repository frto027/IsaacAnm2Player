import { setupAnm2Players } from "./wikiplayer/utils"

if(document.readyState == 'loading'){
    document.addEventListener('DOMContentLoaded', setupAnm2Players)
}else{
    setupAnm2Players()
}

