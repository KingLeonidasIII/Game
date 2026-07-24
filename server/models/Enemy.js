const ENEMY_STATS = {
  slime: {
    health: 30,
    attack: 5,
    defense: 2,
    speed: 40,
    experience: 10,
    sprite: 'slime'
  },
  skeleton: {
    health: 50,
    attack: 10,
    defense: 5,
    speed: 50,
    experience: 20,
    sprite: 'skeleton'
  },
  goblin: {
    health: 40,
    attack: 8,
    defense: 3,
    speed: 60,
    experience: 15,
    sprite: 'goblin'
  },
  dragon: {
    health: 200,
    attack: 25,
    defense: 15,
    speed: 30,
    experience: 100,
    sprite: 'dragon',
    isBoss: true
  }
};

class Enemy {
  constructor(id, type, x, y) {
    this.id = id;
    this.type = type;
    this.x = x;
    this.y = y;
    
    const stats = ENEMY_STATS[type] || ENEMY_STATS.slime;
    this.health = stats.health;
    this.maxHealth = stats.health;
    this.attack = stats.attack;
    this.defense = stats.defense;
    this.speed = stats.speed;
    this.experience = stats.experience;
    this.sprite = stats.sprite;
    this.isBoss = stats.isBoss || false;
  }

  getData() {
    return {
      id: this.id,
      type: this.type,
      x: this.x,
      y: this.y,
      health: this.health,
      maxHealth: this.maxHealth,
      attack: this.attack,
      defense: this.defense,
      sprite: this.sprite,
      isBoss: this.isBoss
    };
  }

  takeDamage(amount) {
    const damage = Math.max(1, amount - this.defense);
    this.health -= damage;
    return damage;
  }

  move(direction, distance) {
    switch (direction) {
      case 'up':
        this.y -= distance;
        break;
      case 'down':
        this.y += distance;
        break;
      case 'left':
        this.x -= distance;
        break;
      case 'right':
        this.x += distance;
        break;
    }
  }

  attackTarget(target) {
    const damage = Math.max(1, this.attack - (target.defense || 0));
    target.takeDamage(damage);
    return damage;
  }
}

module.exports = Enemy;
