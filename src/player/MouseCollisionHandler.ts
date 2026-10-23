class MatrixArea{
    matrix:DOMMatrix
    x:number
    y:number
    w:number
    h:number
    constructor(matrix:DOMMatrix, x:number,y:number,w:number,h:number){
        this.matrix = matrix.inverse()
        this.x = x
        this.y = y
        this.w = w
        this.h = h
    }

    hitTest(x:number, y:number):boolean{
        let point = this.matrix.transformPoint({x,y})
        return point.x >= this.x && point.x <= this.x + this.w && point.y >= this.y && point.y <= this.y + this.h
    }
}

export class MouseCollisionHandler{
    showDebugRect:boolean = false
    enabled: boolean = false

    matrixes: MatrixArea[] = []
    reset(){
        if(!this.enabled) return
        this.matrixes.length = 0
    }
    addMatrixArea(matrix:DOMMatrix, x:number,y:number,w:number,h:number){
        if(!this.enabled) return
        this.matrixes.push(new MatrixArea(matrix,x,y,w,h))
    }
    hitTest(x:number, y:number):boolean{
        if(!this.enabled) return true
        for(let m of this.matrixes){
            if(m.hitTest(x,y))
                return true
        }
        return false
    }
}