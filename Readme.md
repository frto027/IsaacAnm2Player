# anm2Parser

用于将anm2的xml文件转换为json格式，以供浏览器使用

- run.py的folder需要修改为游戏根目录，需要提前解包，并删除其它无关语言的资源文件
- keymapper用于替换json的键名，目前没有启用。启用后可以减小接近一半的数据体积
- 需要传递一个命令行参数表示输出路径

- 它只会复制必要的png图片，有dlc3或dlc3.zh版本就不会用ab+版本

# anm2Player

需要使用TypeScript编译player.ts。

preview.html是一个demo

# docs

这是生成好的预览页面
构架的话执行build.bat
- 需要提前安装TypeScript
- 还需要安装python
- 另外还需要解包游戏，且删掉中文之外的语言资源
- 此外，需要把anm2parser/run.py里面的folder路径换一下
- 然后，docs文件夹里面的东西可以清空掉

# License

MIT License