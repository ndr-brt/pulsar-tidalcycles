'use babel';

const osc = require('osc');

export default class PatternFeedback {
  constructor(editor, ghc, bootTidalPath) {
    this.editor = editor;
    this.ghc = ghc;
    this.bootTidalPath = bootTidalPath

    this.evaluation = {}

    let self = this;

    let charToNumber = (char) => {
      // console.log(`Char to number: ${char}`)
      switch (char) {
        case '0': return 0
        case '½': return 1/2
        case '⅓': return 1/3
        case '⅔': return 2/3
        case '¼': return 1/4
        case '¾': return 3/4
        case '⅕': return 1/5
        case '⅖': return 2/5
        case '⅗': return 3/5
        case '⅘': return 4/5
        case '⅙': return 1/6
        case '⅚': return 5/6
        case '⅐': return 1/7
        case '⅛': return 1/8
        case '⅜': return 3/8
        case '⅝': return 5/8
        case '⅞': return 7/8
        case '⅑': return 1/9
        case '⅒': return 1/10
        case '1': return 1
        default : return eval(char)
      }
    }

    let patternStructure = (definition) => {
      let splitto = definition.split('[')
      splitto.shift()
      let steps = splitto
        .map(it => '['+it)
        .map(it => {
          let fromTo = it.substring(it.indexOf('](')+2, it.indexOf(')|'))
            .split('>')
          // TODO: need a parser!
          let range = it.substring(3, it.indexOf('))'))
            .split('),(')
            .map(it => it.split(',')[0])
            .map(it => parseInt(it))
          return {
            from: charToNumber(fromTo[0]),
            to: charToNumber(fromTo[1]),
            range
          }
        })

      return {
        definition,
        steps
      }
    }

    let bin = {
      collected: '',
      start() {
        setTimeout(() => {
          self.evaluation.patternStructure = patternStructure(self.collected.substring(self.collected.indexOf('[')));
          console.log('New pattern structure')
          console.log(self.evaluation.patternStructure)
          self.collected = '';
        }, 500)
      },
      add(data) {
        self.collected += data
      }
    }

    this.patternStructureGhci = this.ghc.interactive()
      .on('stdout', data => {
        let trimmed = new TextDecoder("utf-8").decode(data).trim()
        if (trimmed.indexOf('tidal>') > -1) {
          bin.start()
        } else {
          bin.add(trimmed)
        }
      })

    this.patternStructureGhci.writeLine(`:script ${this.bootTidalPath}`);

    // ERTEST!

    var udpPort = new osc.UDPPort({
      localAddress: "0.0.0.0",
      localPort: 15151,
      metadata: true
    });

    udpPort.open()
    udpPort.on("message", function (oscMsg) {
      //console.log("An OSC message just arrived!", oscMsg);
      // console.log(`osc message`)
      // console.log(oscMsg)
      let arguments = {}
      let cycle = 0;
      for (var i = 0; i< oscMsg.args.length; i+=2) {
        arguments[oscMsg.args[i].value] = oscMsg.args[i+1].value
        if (oscMsg.args[i].value === 'cycle') {
          cycle = oscMsg.args[i+1].value
        }
      }
      // console.log(arguments)
      // console.log(arguments.cycle)
      // console.log(arguments['cycle'])

      if (self.evaluation.range) {
        let position = cycle - Math.floor(cycle);
        let steps = self.evaluation.patternStructure.steps;
        // console.log('Steps')
        // console.log(steps)
        let step = steps.filter(step => position >= step.from && position < step.to)[0]
        let range = self.evaluation.range
        // console.log('Actual range')
        // console.log(range)
        // console.log('Actual range rows')
        // console.log(range.getRows())
        let expression = self.evaluation.expression
        let patternStart = expression.trim().indexOf('"')
        // let row = range.start.row + 1
        // console.log(`Expression`)
        // console.log(expression)
        // console.log(`Pattern start: ${patternStart}, cycle: ${cycle}, position: ${position}`)
        // console.log(`Step`)
        // console.log(step)
        //
        // console.log(expression)
        // console.log(range)

        let startPoint = [range.getRows()[0], patternStart + step.range[0]];
        let endPoint = [range.getRows()[0], patternStart + step.range[1]];
        // console.log(`Start Point`)
        // console.log(startPoint)
        // console.log(`End Point`)
        // console.log(endPoint)
        let marker = self.editor.markBufferRange([startPoint, endPoint]);
        self.editor.decorateMarker(marker, { type: 'highlight', class: "pattern-feedback" });

        setTimeout(() => {
          marker.destroy()
        },700)
      }

    });
  }

  handle(expression, range) {
    this.patternStructureGhci.writeLine(expression.substring(expression.indexOf("$")+1))
    this.evaluation.range = range
    this.evaluation.expression = expression
  }
}
