# huijianmplayer

文件`huijianmplayer/anm2player.js`是以撒的结合中文维基上[anm2播放器](https://isaac.huijiwiki.com/wiki/%E5%B8%AE%E5%8A%A9:Anm2%E6%92%AD%E6%94%BE%E5%99%A8)的源代码

## 开发现状

anm2parser（xml解析）+anm2player（计算+渲染）可作为Javascript库独立使用，完成`.anm2`文件在html页面的canvas上的渲染过程。huijianmplayer是和灰机wiki网页紧密耦合的一个播放器。这三个部分是在维护中的。

docs文件夹下的内容偶尔维护，因此不保证能够正常使用（视开发进度，随时可能broken）。

随着我不断地摸鱼，本项目逐渐包括但不限于以下内容：
- 完整的anm2解析流程
- 完整的锚点坐标、补间动画计算逻辑
- 允许多个动画在同一个画布上渲染
- 通过svg filter实现的颜色变换，与游戏实际渲染结果一致，贴图可跨域
- 服装工具的多层动画组合渲染逻辑，包含一些边界情况/滤镜的修正逻辑
- 支持多道具的服装堆叠渲染
- 贴图替换、动画切换、翻转、隐藏、倒放、事件等游戏常见操作支持
- 在wiki上实现的基于规则（已图灵完备）的动画播放逻辑，可灵活定制动画播放过程
- 使用Javascript接口更加灵活地定制动画播放流程
- 爆炸视图，可观察服装渲染过程
- ~~（已废弃并移除）3D渲染模式，通过在3D空间下使用正交摄像机直观地展示服装渲染过程~~

如有必要，后续可能会补全的内容：
- shader渲染支持（例如游戏内的马赛克贴图）（需要借助WebGL实现，且要求贴图不可跨域）
- ~~接口文档（不打算做，反正也没人用，有想法请直接联系我做补全，或自己读一读ts文件）~~

# anm2Parser

用于将anm2的xml文件转换为json格式，以供浏览器使用

- run.py的folder需要修改为游戏根目录，需要提前解包，并删除其它无关语言的资源文件
- keymapper用于替换json的键名。启用后可以减小接近一半的数据体积
- 需要传递一个命令行参数表示输出路径

- 它只会复制必要的png图片，有dlc3或dlc3.zh版本就不会用ab+版本

# anm2Player

需要使用TypeScript编译player.ts。

~~preview.html是一个demo（已停止维护）~~

# docs

这是生成好的预览页面（仅供调试，与wiki无关）
构建的话执行build.bat
- 需要提前安装TypeScript
- 还需要安装python
- 另外还需要解包游戏，且删掉中文之外的语言资源
- 此外，需要把anm2parser/run.py里面的folder路径换一下
- 然后，docs文件夹里面的东西可以清空掉

# compress_png.py

可以提高docs目录下png图像的压缩等级（无损）

# License

MIT License