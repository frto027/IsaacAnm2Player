const babel = require("@babel/core")
const fs = require("fs")

const source_path = "dist/bundle.js"
const source = fs.readFileSync(source_path, { encoding: "utf-8" })
const parsedAst = babel.parseSync(source)

const compiled = babel.transformFromAstSync(parsedAst, source, {
    presets: [["@babel/preset-env", { targets: ["IE 8"] }]],
}).code
fs.writeFileSync("dist/bundle.release.js", compiled)
