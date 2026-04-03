//         这是一个神奇的编译脚本
//         它读取CraftingUI.original.js的源码，然后做这些事情：

//         它会将下面的字符串file path替换为路径为file path的文件内容
//         /*@read-file*/"file path"

//         如果不加--debug参数执行，它会
//         删除@debug-only注释后的语句
//         删除所有包含@remove-comment的注释

//         最后，它输出CraftingUI.compiled.release.js，此源代码已经转换，符合IE8的语法规范

const babel = require("@babel/core")
const fs = require("fs")

const source_path = "dist/bundle.js"
const source = fs.readFileSync(source_path, { encoding: "utf-8" })
const parsedAst = babel.parseSync(source)

const compiled = babel.transformFromAstSync(parsedAst, source, {
    presets: [["@babel/preset-env", { targets: ["IE 8"] }]],
}).code
fs.writeFileSync("dist/bundle.release.js", compiled)
