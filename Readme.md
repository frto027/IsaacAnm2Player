# huijianmplayer

这是以撒的结合中文维基上[anm2播放器](https://isaac.huijiwiki.com/wiki/%E5%B8%AE%E5%8A%A9:Anm2%E6%92%AD%E6%94%BE%E5%99%A8)的源代码

# TypeScript重构

我们需要重构。

这是Anm2Player的TypeScript重构分支。

# how to build

```cmd
npm install
npm run build -- for debug version, use dist/bundle.js
npm run release -- for release version, use dist/bundle.release.js
```

# 功能描述

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
- 基于WebGL的shader渲染支持（例如游戏内的马赛克/教条贴图），超帅的！

# License

MIT License (Excluding Shaders)
