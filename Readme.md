# anm2Parser

用于将anm2的xml文件转换为json格式，以供浏览器使用

- run.py的folder需要修改为游戏根目录，需要提前解包，并删除其它无关语言的资源文件
- keymapper用于替换json的键名，目前没有启用。启用后可以减小接近一半的数据体积

# anm2Player

需要使用TypeScript编译player.ts。

preview.html是一个demo

# web

这是生成好的预览页面
构架的话执行build.bat，需要提前安装TypeScript