export class NumberFunction{
    next?:NumberFunction
    value:number
    constructor(v:number){
        this.value = v
    }
    update(){
    }
    static parse(str:string, old?:NumberFunction):NumberFunction{
        let m = ForwardFunction.pattern.exec(str)
        if(m){
            return new ForwardFunction(str,m)
        }

        m = ContiniousFunction.pattern.exec(str)
        if(m){
            return new ContiniousFunction(m, old)
        }
        return new NumberFunction(+str)
    }
}

class ForwardFunction extends NumberFunction{
    // expr:mathjs.MathNode
    // forward(from\to\time\pow)
    static pattern = /^forward\(([\-\.\d]+)\\([\-\.\d]+)\\([\.\d]+)\\([\.\d]+)\)$/
    from:number
    to:number
    time:number
    rate:number
    constructor(str:string, match:RegExpExecArray){
        super(0)
        this.from = +match[1]!
        this.to = +match[2]!
        this.time = +match[3]!
        this.rate = +match[4]!
    }
    t = 0
    update(): void {
        if(this.t >= this.time){
            this.next = new NumberFunction(this.to)
        }else{
            this.value = (this.to - this.from) * (Math.pow(this.t / this.time, this.rate)) + this.from
        }
        this.t += 1
    }
}

class ContiniousFunction extends NumberFunction{
    static pattern = /^continue\+?\(([\+\-\d\.\\]+)\)$/
    args:number[] = []
    values:number[] = []
    constructor(match:RegExpExecArray, old?:NumberFunction){
        super(old ? old.value : 0)
        const vstrs = match[1]!.split("\\")
        if(vstrs.length == 0){
            this.values.push(this.value)
            return
        }else{
            this.values.push(+vstrs[0]!)
        }

        if(match[0].startsWith("continue+")){
            this.values[0]! += old?.value ?? 0
        }

        for(let i=1;i<vstrs.length;i++){
            this.args.push(+vstrs[i]!)
            if(old && old instanceof ContiniousFunction && old.values.length > i){
                this.values.push(old.values[i]!)
            }else{
                this.values.push(this.value)
            }
        }

        console.assert(this.args.length + 1 == this.values.length)
    }

    update(): void {
        for(let i=1;i<this.values.length;i++){
            this.values[i] = (this.values[i-1]! - this.values[i]!) * this.args[i-1]! + this.values[i]!
        }
        this.value = this.values[this.values.length-1]!
    }


}