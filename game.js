'use strict';

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  plus(vector) {
    if (!(vector instanceof Vector)) {
      throw new Error('Можно прибавлять к вектору только вектор типа Vector');
    }
    return new Vector(this.x + vector.x, this.y + vector.y);
  }
  times(factor) {
    return new Vector(this.x * factor, this.y * factor);
  }
}

class Actor {
  constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
    if ((!(pos instanceof Vector)) || (!(size instanceof Vector)) || (!(speed instanceof Vector)))  {
      throw new Error('Аргумент не является объектом типа Vector');
    }
    this.pos = pos;
    this.size = size;
    this.speed = speed;
  }
  act() {
  }
  get left() {
    return this.pos.x;
  }
  get top() {
    return this.pos.y;
  }
  get right() {
    return this.pos.x + this.size.x;
  }
  get bottom() {
    return this.pos.y + this.size.y;
  }
  get type() {
    return 'actor';
  } 
  isIntersect(anotherActor) {
    if (!(anotherActor instanceof Actor)) {
      throw new Error('Аргумент не является объектом типа Vector');
    }
    if (this === anotherActor) { 
      return false;
    }   
    return this.right > anotherActor.left && 
           this.left < anotherActor.right && 
           this.top < anotherActor.bottom && 
           this.bottom > anotherActor.top;
  }        
}

class Level {
  constructor (grid = [], actors = []) {
    this.grid = grid;
    this.actors = actors;
    this.player = this.actors.find(actor => actor.type === 'player');
    this.height = grid.length;
    this.width = Math.max(0, ...grid.map(item => item.length));
    this.status = null;
    this.finishDelay = 1; 
  }
  isFinished() {
    return this.status !== null && this.finishDelay < 0;
  }
  actorAt(actor) {
    if(!(actor instanceof Actor)) {
      throw new Error('Нет аргумента или объект не является типа Actor');
    }
    return this.actors.find(el => el.isIntersect(actor));
  }
  obstacleAt(nextPosition, size) {
    if(!(nextPosition instanceof Vector && size instanceof Vector)) {
      throw new Error ('Нет аргумента или объект не является типа Vector');
    }
    const left = Math.floor(nextPosition.x);
    const right = Math.ceil(nextPosition.x + size.x);
    const top = Math.floor(nextPosition.y); 
    const bottom = Math.ceil(nextPosition.y + size.y);
    if(left < 0 || right > this.width || top < 0) {
      return 'wall';
    } 
    if(bottom > this.height) {
      return 'lava';
    }
     for(let y = top; y < bottom; y++) {
      for(let x = left; x < right; x++) {
        const obstacle = this.grid[y][x];
        if(obstacle) {
          return obstacle;
        }
      }
    }	
  }
  removeActor(actor) {
    const index = this.actors.indexOf(actor);
    if (index >= 0) {
        this.actors.splice(index, 1);
    }
  }
  noMoreActors(actorType) {
    return !this.actors.some(el => el.type === actorType);
  }
  playerTouched(obstruction, movingObject) {
    if (this.status) {
      return;
    }
    if (obstruction === 'lava' || obstruction === 'fireball') {
      this.status = 'lost';
      return;
    }
    if (obstruction === 'coin' && movingObject) {
      this.removeActor(movingObject);
      if (this.noMoreActors('coin')) {
        this.status = 'won';
      }
    }
  }
}

class LevelParser {
  constructor(dictionary = {}) {
    this.dictionary = Object.assign({}, dictionary);
  }
  actorFromSymbol(symbol) {
    return this.dictionary[symbol];
  }
  obstacleFromSymbol(symbol) {
    if(symbol === 'x') {
      return 'wall';
    }
    if (symbol === '!') {
      return 'lava';
    }
  }
  createGrid(plan) {
    return plan.map(string => string.split('')).map(string => string.map(string => this.obstacleFromSymbol(string))); 
  }
  createActors(stringsArray) {
    const finalArray = [];
    for (let y = 0; y < stringsArray.length; y++) {
      for (let x = 0; x < stringsArray[y].length; x++) {
        const symbol = stringsArray[y][x];
        const objClass = this.actorFromSymbol(symbol);	   
        if(typeof objClass === 'function') { 
          const vector = new Vector(x, y); 
          const movingObject = new objClass(vector); 
          if(movingObject instanceof Actor) { 
             finalArray.push(movingObject);
          } 
        } 
      }
    }	
    return finalArray;	
  }
  parse(stringsArray) {
    return new Level(this.createGrid(stringsArray), this.createActors(stringsArray));
  }
}

class Fireball extends Actor {
  constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
    super(pos, new Vector(1, 1), speed);
  }
  get type() {
      return 'fireball';
  }
  getNextPosition(time = 1) {
    return this.speed.times(time).plus(this.pos);
  }
  handleObstacle() {
    this.speed = this.speed.times(-1);
  }
  act(time, level) {
    const newPosition = this.getNextPosition(time);
    if (level.obstacleAt(newPosition, this.size)) {
      this.handleObstacle();
    } else {
      this.pos = this.getNextPosition(time);
    }
  }
}

class HorizontalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    const speed = new Vector(2, 0);
    super(pos , speed);
  }
  get type() {
    return 'fireball';
  }
}

class VerticalFireball extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    const speed = new Vector(0, 2);
    super(pos, speed);
  }
  get type() {
    return 'fireball';
  }
}

class FireRain extends Fireball {
  constructor(pos = new Vector(0, 0)) {
    const speed = new Vector(0, 3);
    super(pos, speed);
    this.startPosition = this.pos;
  }
  handleObstacle() {
    this.pos = this.startPosition;
  }
}

class Coin extends Actor {
  constructor(pos = new Vector(0, 0)) {
    const size = new Vector(0.6, 0.6);
    const currentPosition = pos.plus(new Vector(0.2, 0.1));
    super(currentPosition, size);
    this.springSpeed = 8;
    this.springDist = 0.07;
    this.spring = 2 * Math.PI;
    this.basicPosition = this.pos
  }
  get type() {
    return 'coin';
  }
  updateSpring(time = 1) {
    this.spring += this.springSpeed * time;
  }
  getSpringVector() {
    const y = Math.sin(this.spring) * this.springDist;
    return new Vector(0, y);
  }
  getNextPosition(time) {
    this.updateSpring(time);
    this.pos = this.basicPosition.plus(this.getSpringVector());
    return this.pos;
  }
  act(time) {
    this.pos = this.getNextPosition(time);
  }
}

class Player extends Actor {
  constructor(pos = new Vector()) {
    super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5), new Vector(0, 0));
  }
  get type() {
    return 'player';
  }
}

const actorDict = {
  '@': Player,
  'v': FireRain,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball,
};
const parser = new LevelParser(actorDict);

loadLevels().then(levels => {
  return runGame(JSON.parse(levels), parser, DOMDisplay)
}).then(result => alert('Вы выиграли!'));
