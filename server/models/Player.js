const CLASS_STATS = {
  warrior: {
    health: 120,
    attack: 15,
    defense: 10,
    speed: 80,
    abilities: ['slash', 'shield_bash']
  },
  mage: {
    health: 80,
    attack: 20,
    defense: 5,
    speed: 70,
    mana: 100,
    abilities: ['fireball', 'heal']
  },
  rogue: {
    health: 100,
    attack: 18,
    defense: 7,
    speed: 100,
    abilities: ['backstab', 'dodge']
  }
};

const ABILITY_EFFECTS = {
  slash: { damage: 15, manaCost: 0 },
  shield_bash: { damage: 10, stunDuration: 2, manaCost: 0 },
  fireball: { damage: 25, manaCost: 20 },
  heal: { healAmount: 30, manaCost: 15 },
  backstab: { damage: 25, manaCost: 0 },
  dodge: { damage: 0, manaCost: 10 } // Evades next attack
};

class Player {
  constructor(id, playerClass, x, y) {
    this.id = id;
    this.class = playerClass;
    this.x = x;
    this.y = y;
    this.direction = 'down';
    this.socket = null;
    
    // Stats
    const stats = CLASS_STATS[playerClass] || CLASS_STATS.warrior;
    this.health = stats.health;
    this.maxHealth = stats.health;
    this.attack = stats.attack;
    this.defense = stats.defense;
    this.speed = stats.speed;
    this.mana = stats.mana || 0;
    this.maxMana = stats.mana || 0;
    this.abilities = stats.abilities || [];
    
    // Inventory
    this.inventory = [];
    this.equipped = {
      weapon: null,
      armor: null
    };
  }

  getData() {
    return {
      id: this.id,
      class: this.class,
      x: this.x,
      y: this.y,
      direction: this.direction,
      health: this.health,
      maxHealth: this.maxHealth,
      mana: this.mana,
      maxMana: this.maxMana,
      attack: this.attack,
      defense: this.defense,
      speed: this.speed,
      abilities: this.abilities,
      inventory: this.inventory.map(item => item.getData()),
      equipped: {
        weapon: this.equipped.weapon ? this.equipped.weapon.getData() : null,
        armor: this.equipped.armor ? this.equipped.armor.getData() : null
      }
    };
  }

  getAttackDamage(ability) {
    const abilityEffect = ABILITY_EFFECTS[ability];
    if (!abilityEffect) {
      return this.attack; // Default attack
    }
    
    // Check if player has enough mana
    if (this.mana < abilityEffect.manaCost) {
      return 0; // Not enough mana
    }
    
    // Deduct mana
    this.mana -= abilityEffect.manaCost;
    
    return abilityEffect.damage || this.attack;
  }

  takeDamage(amount) {
    const damage = Math.max(1, amount - this.defense);
    this.health -= damage;
    return damage;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addToInventory(item) {
    this.inventory.push(item);
  }

  useItem(item) {
    switch (item.type) {
      case 'health_potion':
        this.heal(30);
        break;
      case 'mana_potion':
        this.mana = Math.min(this.maxMana, this.mana + 30);
        break;
      case 'gold':
        // Gold is just collected, no effect
        break;
      default:
        // Equip weapons/armor
        if (item.type === 'sword' || item.type === 'staff' || item.type === 'bow') {
          this.equipped.weapon = item;
          this.attack += item.attackBonus || 0;
        } else if (item.type === 'shield' || item.type === 'armor') {
          this.equipped.armor = item;
          this.defense += item.defenseBonus || 0;
        }
        break;
    }
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
    this.direction = direction;
  }
}

module.exports = Player;
