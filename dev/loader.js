var version = "20260402"

var load_url = "/index.php?title=Gadget:Anm2Player.bundle.js&action=raw"

function load(){
    console.log("加载Anm2播放器...")
    var script = localStorage.getItem("anm2player-script")

    var label = document.createElement("script")
    label.async = false

    if(script == null){
        console.error("Anm2播放器加载错误，缓存为空，将放弃手动缓存并使用script标签进行加载")
        label.src = load_url
    }else{
        label.innerHTML = script
    }

    document.head.appendChild(label)
}

if(localStorage.getItem("anm2player-ver") != version || localStorage.getItem("anm2player-script") == null){
    console.log("Anm2播放器需要更新，正在获取并缓存新版本")
    fetch(load_url).then(function(v){
        v.text().then(function(v){
            console.log("Anm2播放器源码获取成功")
            localStorage.setItem("anm2player-script", v)
            load()
        })
    })
}else{
    load()
}