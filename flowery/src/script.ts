


// Tidier code with webpack and better Typescript in Github
// https://github.com/ste-vg/plant-drawer





console.clear();

interface Position
{
    x: number;
    y: number;
}

enum BranchState
{
    ready,
    animating,
    ended
}

interface BranchSettings
{
    x: number;
    y: number;
    directionX?: number;
    directionY?: number;
    length?: number;
    sections: number;
    width?: number;
    chunkLength?: number;
    color?: string;
    progress?: number;
    opacity?: number;
}

interface FlowerColors
{
    outer: string;
    inner: string;
}

interface BranchSet
{
    path: SVGPathElement;
    settings: BranchSettings;
}

interface Out
{
    position: Position;
    width?: number;
    sections?: number;
}

class Branch
{
    private grid:number;
    private stage:HTMLElement;
    private branch:SVGPathElement;
    public branches: BranchSet[] = [];
    private settings:BranchSettings;
    public state:BranchState = BranchState.ready;
    private placeBehind:Branch;
    
    public branchOut:Subject<Out> = new Rx.Subject();
    public thornOut:Subject<Out> = new Rx.Subject();
    public flowerOut:Subject<Out> = new Rx.Subject();
    public leafOut:Subject<Out> = new Rx.Subject();

    constructor(stage:HTMLElement, settings:BranchSettings, grid:number, placeBehind:Branch = null)
    {
        this.grid = 50;//grid;
        this.stage = stage;
        this.placeBehind = placeBehind;
   
        settings.width = 2;
        settings.opacity = 1;

        this.state = BranchState.animating;
        let path = this.createLine(settings);
        let branchCount:number = 2;
        for(let i = 0; i < branchCount; i++)
        {
            this.createSqwig(i, branchCount, path, JSON.parse(JSON.stringify(settings)) as BranchSettings)
        }
    }

    createSqwig(index:number, total:number, path:string, settings:BranchSettings)
    {
        let branch = document.createElementNS("http://www.w3.org/2000/svg", 'path')
            branch.setAttribute('d', path)
            branch.style.fill = 'none';
            branch.style.stroke = this.getColor(index);
            branch.style.strokeLinecap = "round";
        
        settings.length = branch.getTotalLength();
        settings.progress = settings.length;

        branch.style.strokeDasharray= `${settings.length}, ${settings.length}`;
        branch.style.strokeDashoffset = `${settings.length}`;

        this.branches.push({path: branch, settings: settings});
        if(!this.placeBehind) this.stage.appendChild(branch);
        else this.stage.insertBefore(branch, this.placeBehind.branches[0].path)

        let widthTarget = settings.sections * 0.8;

        TweenMax.set(branch, {x: -index * 2, y: -index * 2})

        TweenMax.to(settings, settings.sections * 0.4, {
            progress: 0,
            width: widthTarget,
            ease: Power1.easeOut,
            delay: index * (settings.sections * 0.001),
            onUpdate: () => 
            {
                if(index == 0 && settings.sections > 4)
                {
                    let choice = Math.random();
                    let length = settings.length - settings.progress;
                    let pos = branch.getPointAtLength(length);

                    let sec = Math.ceil((settings.progress / settings.length) * settings.sections) - 2;
                        if( sec < 4) sec = 4;

                    let out:Out = {
                        position: {x: pos.x, y: pos.y},
                        width: widthTarget,
                        sections: sec
                    }

                    if(choice < 0.02) this.branchOut.next(out)
                    else if(choice < 0.1) this.thornOut.next(out)
                    else if(choice < 0.2) this.flowerOut.next(out)
                    else if(choice < 0.4) this.leafOut.next(out)
                }
            },
            onComplete: () => 
            {
                if(index = total - 1) this.state = BranchState.ended;
                //branch.remove();
            }
        })
    }

    public update()
    {
        this.branches.map((set: BranchSet) => 
        {
            set.path.style.strokeDashoffset = `${set.settings.progress}`;
            set.path.style.strokeWidth = `${set.settings.width}px`;
            //set.path.style.opacity = `${set.settings.opacity}`;
        })
        
    }

    private createLine(settings:BranchSettings):string
    {
        let x = settings.x;
        let y = settings.y;
        let dx = settings.directionX;
        let dy = settings.directionY;
        let path:string[] = [
            'M',
            '' + x,
            '' + y
            
        ]

        let steps = settings.sections;
        let step = 0;
        let getNewDirection = (direction: string, goAnywhere:boolean) => 
        {
            if(!goAnywhere && settings['direction' + direction.toUpperCase()] != 0) return settings['direction' + direction.toUpperCase()];
            return Math.random() < 0.5 ? -1 : 1;
        }

        if(steps * 2 > step) path.push("Q")

        while(step < steps * 2)
        {
            step++;
            let stepUp = this.stepUp(step);
            x += (dx * stepUp) * this.grid;
            y += (dy * stepUp) * this.grid;
            if(step != 1) path.push(',');
            path.push('' + x);
            path.push('' + y);
            
            if(step % 2 != 0)
            {
                dx = dx == 0 ? getNewDirection('x', step > 8) : 0;
                dy = dy == 0 ? getNewDirection('y', step > 8) : 0;
            }
        }

        return path.join(' ');
    }

    private stepUp(step:number):number
    {
        let r = Math.random() * 10;
        return step / (10 + r)
    }

    public clear()
    {
        this.branchOut.complete();
        this.thornOut.complete();
        this.leafOut.complete();
        this.flowerOut.complete();
        this.branches.map((set: BranchSet) => set.path.remove())
    }

    private getColor(index:number):string
    {
        let base = ['#646F4B']
        let greens = ['#6FCAB1'];//, '#5DC4A8', '#4BBD9E', '#3AB795', '#A7CCBA', '#91C0A9', '#86BAA1']

        let chooseFrom = index == 0 ? base : greens;
        return chooseFrom[Math.floor(Math.random() * chooseFrom.length)];
    }
}

class Flower
{
    petals:SVGPathElement[] = [];

    constructor(stage:HTMLElement, position: Position, size:number, colors:FlowerColors)
    {
        //outer petals

        let petalCount = 8;
        let p = petalCount;
        let rotateAmount = 360 / petalCount;
        let growRotation = (Math.random() * 120) - 60;

        while(p > 0)
        {
            --p;
            let petal = document.createElementNS("http://www.w3.org/2000/svg", 'path')
                petal.setAttribute('d', this.createPetalPath({x: 0, y: 0}, size))
                petal.setAttribute('class', 'petal')
                petal.style.fill = colors.outer;
                petal.style.stroke = 'none';

            this.petals.push(petal);
            let rotate = (rotateAmount * p) + Math.random() * 30;
            
            TweenMax.set(petal, {scale:0, x: position.x, y: position.y, rotation: rotate})
            let delay = Math.random();
            TweenMax.to(petal, 1.5, {scale:1, delay: delay})
            TweenMax.to(petal, 3, {rotation: '+=' + growRotation, delay: delay, ease: Elastic.easeOut})
            
            stage.appendChild(petal);
        }

        // inner petals

        petalCount = 6;
        p = petalCount;
        rotateAmount = 360 / petalCount;
        while(p > 0)
        {
            --p;
            let petal = document.createElementNS("http://www.w3.org/2000/svg", 'path')
                petal.setAttribute('d', this.createPetalPath({x: 0, y: 0}, size / 2))
                petal.setAttribute('class', 'petal')
                petal.style.fill = colors.inner;
                petal.style.stroke = 'none';

            this.petals.push(petal);
            let rotate = (rotateAmount * p) + Math.random() * 30;

            TweenMax.set(petal, {scale:0, x: position.x, y: position.y, rotation: rotate})
            TweenMax.to(petal, 6, {scale:1, rotation: '+=' + growRotation, delay: 1 + Math.random(), ease: Elastic.easeOut})
            
            stage.appendChild(petal);
        }
    }

    private createPetalPath(p: Position, size: number):string
    {
        let top = size * 4;
        let middle = size * 1.8;
        let width = size;
        let path = `M ${p.x} ${p.y} Q ${p.x - width} ${p.y + middle}  ${p.x} ${p.y + top} Q ${p.x + width} ${p.y + middle} ${p.x} ${p.y} Z`  
        return path;
    }

    public clear()
    {
        this.petals.map((petal: SVGPathElement) => petal.remove())
    }
}

class Leaf
{
    leaf:SVGPathElement;

    constructor(stage:HTMLElement, position: Position, size:number)
    {
        
        this.leaf = document.createElementNS("http://www.w3.org/2000/svg", 'path')
            this.leaf.setAttribute('d', this.createLeafPath({x: 0, y: 0}, size))
            this.leaf.setAttribute('class', 'leaf')
            this.leaf.style.fill = this.getColor();
            this.leaf.style.stroke = 'none';

        let rotate = Math.random() * 360;
        let rotateGrow = (Math.random() * 300) - 150;

        TweenMax.set(this.leaf, {scale:0, x: position.x, y: position.y, rotation: rotate})
        TweenMax.to(this.leaf, 3, {scale:1})
        TweenMax.to(this.leaf, 4, {rotation: rotate + rotateGrow, ease: Elastic.easeOut})
        
        stage.appendChild(this.leaf);
    }

    private createLeafPath(p: Position, size: number):string
    {
        let top = size * (3 + Math.random() * 2);
        let middle = size * (1 + Math.random());
        let width = size * (1.5 + Math.random() * 0.5);
        let path = `M ${p.x} ${p.y} Q ${p.x - width} ${p.y + middle}  ${p.x} ${p.y + top} Q ${p.x + width} ${p.y + middle} ${p.x} ${p.y} Z`  
        return path;
    }

    private getColor():string
    {
        let greens = ['#00A676', '#00976C', '#008861', '#007956']
        return greens[Math.floor(Math.random() * greens.length)];
    }

    public clear()
    {
        this.leaf.remove()
    }
}

class Thorn
{ 
    private thorn:SVGPathElement;

    constructor(stage:HTMLElement, position: Position, size:number)
    {
        this.thorn = document.createElementNS("http://www.w3.org/2000/svg", 'path')
            this.thorn.setAttribute('d', this.createThornPath({x: 0, y: 0}, size))
            this.thorn.setAttribute('class', 'thorn')
            this.thorn.style.fill = '#646F4B';
            this.thorn.style.stroke = 'none';

        TweenMax.set(this.thorn, {scale:0, x: position.x, y: position.y, rotation: Math.random() * 360})
        TweenMax.to(this.thorn, 3, {scale:1})
        
        stage.appendChild(this.thorn);
    }

    private createThornPath(p:Position, w:number):string
    {
        let path = `M ${p.x} ${p.y} Q ${p.x - w / 2} ${p.y}  ${p.x - w / 2} ${p.y + w / 4} L ${p.x} ${p.y + w * 2} L ${p.x + w / 2} ${p.y + w / 4} Q ${p.x + w / 2} ${p.y} ${p.x} ${p.y} Z`  
        return path;
    }

    public clear()
    {
        this.thorn.remove();
    }
}

class App
{
	private container:HTMLElement;
	private downloadButton:HTMLElement;
	private svg:HTMLElement;
	private branches:Branch[] = [];
	private thorns:Thorn[] = [];
	private flowers:Flower[] = [];
	private leaves:Leaf[] = [];
	
	private branchGroup:HTMLElement;
	private thornGroup:HTMLElement;
	private leafGroup:HTMLElement;
	private flowerGroup:HTMLElement;

	private width: number = 600;
	private height: number = 600;

	private lastMousePosition:Position;
	private direction:Position;

	private grid:number = 40;

	private flowerColors:FlowerColors;

	constructor(container:HTMLElement, downloadButton:HTMLElement)
	{
		this.container = container;
		this.downloadButton = downloadButton;
		this.svg = document.getElementById('stage');
		
		this.branchGroup = document.getElementById('branchGroup');
		this.thornGroup = document.getElementById('thornGroup');
		this.leafGroup = document.getElementById('leafGroup');
		this.flowerGroup = document.getElementById('flowerGroup');
		
		this.onResize();

		this.tick();

		Rx.Observable.fromEvent(this.downloadButton, 'click')
			.map((mouseEvent:MouseEvent) => {mouseEvent.preventDefault()})
			.subscribe(() => this.download());
		
		Rx.Observable.fromEvent(this.container, 'click')
			.map((mouseEvent:MouseEvent) => 
			{
				mouseEvent.preventDefault();
				return {
					x: mouseEvent.clientX, 
					y: mouseEvent.clientY
				};
			})
			.subscribe((position:Position) => 
			{
				this.clearOld();
				this.startBranch(16, position, true);
			});

		this.startBranch(16, {x: this.width / 2, y: this.height / 2}, true);

		Rx.Observable.fromEvent(window, "resize").subscribe(() => this.onResize())
	}

	private clearOld()
	{
		this.branches.map((branch:Branch) => 
		{
			branch.clear();
		});
		this.thorns.map((thorn:Thorn) => thorn.clear());
		this.flowers.map((flower:Flower) => flower.clear());
		this.leaves.map((leaf:Leaf) => leaf.clear());

		TweenMax.killAll();

		this.branches = [];
		this.thorns = [];
		this.flowers = [];
		this.leaves = [];
	}

	private startBranch(sections:number, position:Position, setColors:boolean = false)
	{
		if(setColors)
		{
			this.flowerColors = {
				outer: this.getColor(),
				inner: this.getColor()
			}
		}

		let dx = Math.random();
		if(dx > 0.5) dx = dx > 0.75 ? 1 : -1;
		else dx = 0;
		let dy= 0;
		if(dx == 0) dx = Math.random() > 0.5 ? 1 : -1;

		let settings:BranchSettings = {
			x: position.x,
			y: position.y,
			directionX: dx,
			directionY: dy,
			sections: sections
		}
		let newBranch = new Branch(this.branchGroup, settings, this.grid/2 + Math.random() * this.grid/2, this.branches.length > 1 ? this.branches[this.branches.length - 2]: null);
		
		newBranch.branchOut.debounceTime(200).subscribe((out:Out) => this.startBranch(out.sections, out.position))
		newBranch.thornOut.debounceTime(100).subscribe((out:Out) => this.thorns.push(new Thorn(this.thornGroup, out.position, out.width)))
		newBranch.flowerOut.debounceTime(300).subscribe((out:Out) => this.flowers.push(new Flower(this.flowerGroup, out.position, out.width, this.flowerColors)))
		newBranch.leafOut.debounceTime(50).subscribe((out:Out) => this.leaves.push(new Leaf(this.leafGroup, out.position, out.width)))
		this.branches.push(newBranch);
	}

	private onResize()
	{
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;

		this.svg.setAttribute('width', String(this.width));
		this.svg.setAttribute('height', String(this.height));
	}

	private tick()
	{
		let step = this.branches.length - 1;

		while(step >= 0)
		{
			if(this.branches[step].state != BranchState.ended)
			{
				this.branches[step].update();
			}
			--step;	
		}

		requestAnimationFrame(() => this.tick());
	}

	private download()
	{
		var a = document.createElement('a'), xml, ev;
		a.download = 'my-amazing-plant(by ste.vg).svg'; 
		xml = (new XMLSerializer()).serializeToString(this.svg); 
		a.href = 'data:application/octet-stream;base64,' + btoa(xml);

		ev = document.createEvent("MouseEvents");
		ev.initMouseEvent("click", true, false, self, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
		a.dispatchEvent(ev);
	}

	private getColor():string
    {
        let offset = Math.round(Math.random() * 100)
        var r = Math.sin(0.3 * offset) * 100 + 155;
        var g = Math.sin(0.3 * offset + 2) * 100 + 155;
        var b = Math.sin(0.3 * offset + 4) * 100 + 155;
        return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
	}
	
	private componentToHex(c:number) 
    {
        var hex = Math.round(c).toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }
}



let container = document.getElementById('app');
let downlaodButton = document.getElementById('download-button');
let app = new App(container, downlaodButton);